const Point = require("./point.js")
const NearestNeighbors = require("./nearest_neighbors.js")
const Quadtree = require("./quadtree.js")
const FXRandom = require("./fxrandom.js")

module.exports = class TSNE {
  constructor (config, rnd) {
    // config
    config = config || {}
    this.perplexity = config.perplexity || 10.0
    this.early_exaggeration = config.early_exaggeration || 4.0
    this.learning_rate = config.learning_rate || 10.0
    this.max_iter = config.max_iter || 1000
    this.neighborhood_multiplier = config.neighborhood_multiplier || 3
    this.theta = config.theta || 0.5 // theta parameter for Barnes-Hut
    this.barnes_hut_cutoff = config.barnes_hut_cutoff || 2000 // number of datapoints above which Barnes-Hut becomes faster than naive method, depends on value of theta

    // random number generator
    this.rnd = rnd

    // various constants calculated from config parameters

    // number of nearest neighbors in the input data space
    this.nneighbors = Math.floor(this.neighborhood_multiplier*this.perplexity)
    // target entropy given by perplexity parameter
    this.H_target = Math.log(this.perplexity)
  }

  /**
   * Add data to the TSNE object and generally set things up for
   * subsequent optimziation steps.
   * 
   * @param @param {Array} point_data - An array of `Point`s serving
   * as the input data.
   */
  initData (point_data) {
    // record data size
    this.N = point_data.length
    
    // calculate nearest neighbors on input data
    let nn = new NearestNeighbors(point_data, this.nneighbors)
    let input_distances = nn.getNeighbors()

    // now calculate conditional probabilities and store for later
    // they will never change
    this.pj_given_i = new Array(this.N)
    for (let i = 0; i < this.N; i++) {
      this.pj_given_i[i] = pJGivenI(input_distances[i], this.H_target)
    }

    // set up solution
    this.solution = makePointArrayRandom(this.N, this.rnd)
    // store for previous step
    this.previous_step = makePointArrayConstant(this.N, 0, 0)
    // store for gain (for adaptive learning rate)
    this.gain = makePointArrayConstant(this.N, 1, 1)
    // the current iteration
    this.current_iter = 0
  }

  /**
   * Take optimization step
   */
   takeStep() {
     let exaggeration = (this.current_iter < 100 ? this.early_exaggeration : 1)
     let alpha = (this.current_iter < 250 ? 0.5 : 0.8)
     let point_sum = new Point(0, 0) // to calculate mean
     let N = this.N
     this.current_iter += 1

     // calculate the gradient
     let gradient = this.calculateGradient(exaggeration)
     // update solution
     for (let i = 0; i<N; i++) {
       let newgain_x = (sign(gradient[i].x) === sign(this.previous_step[i].x) ? this.gain[i].x * 0.8 : this.gain[i].x + 0.2)
       if (newgain_x < 0.01) {
         newgain_x = 0.01 // clamp so we never run gain to zero
       }
       let newgain_y = (sign(gradient[i].y) === sign(this.previous_step[i].y) ? this.gain[i].y * 0.8 : this.gain[i].y + 0.2)
       if (newgain_y < 0.01) {
         newgain_y = 0.01 // clamp so we never run gain to zero
       }
        
       // store updated gain
       this.gain[i] = new Point(newgain_x, newgain_y)

       // first contribution: gradient times learning rate
       let step = gradient[i].mult(-this.learning_rate)
       // apply gain
       step.x *= newgain_x
       step.y *= newgain_y
       
       // second contribution: momentum
       step.addInPlace(this.previous_step[i].mult(alpha))
       
       // take step
       this.solution[i].addInPlace(step)
       // record last step taken
       this.previous_step[i] = step
       // calculate point sum for centering
       point_sum.addInPlace(this.solution[i])
     }
     // normalize point sum
     point_sum.divInPlace(N)
     // center solution
     for (let i = 0; i < N; i++) {
       this.solution[i].subtractInPlace(point_sum)
     }
   }

  
  /**
   * @param @param {Array} point_data - An array of `Point`s serving
   * as the input data.
   */
  calculateGradient (exaggeration = 1) {
    // attractive forces
    let Fattr = this.calcFattr()

    // repulsive forces
    let Frep
    if (this.N > this.barnes_hut_cutoff) {
      Frep = this.calcFrep()
    } else {
      Frep = this.calcFrepQuadratic()
    }
  
    // for simplicity, we turn the Fattr variable into the entire 
    // gradient
    for (let i = 0; i<Fattr.length; i++) {
      Fattr[i].multInPlace(exaggeration)
      Fattr[i].addInPlace(Frep[i])
      Fattr[i].multInPlace(4)
    }
    return Fattr
  }
  
  
  /**
   * Calculates all the attractive forces
   */
  calcFattr () {
    let N = this.N
    let Fattr = makePointArrayConstant(N, 0, 0)
    
    // we multiply p_j|i with q_ij Z and then accumulate
    for (let i = 0; i < N; i++) {
      for (let {j:j, value:v} of this.pj_given_i[i]) {
        // scalar component
        let x = v * qijZ(i, j, this.solution) / (2*N)
        // now we need to calculate (y_i - y_j) and multiply with x
        let f_ij = (this.solution[i].subtract(this.solution[j])).mult(x)
        // and reverse
        let f_ji = f_ij.mult(-1)
        Fattr[i].addInPlace(f_ij)
        Fattr[j].addInPlace(f_ji) // symmetrize, Eq. (7) of van der Maaten 2014
      }
    }
    return Fattr
  }
  
  /**
   * Calculates all the repulsive forces
   */
  calcFrep () {
    let N = this.N
    let Frep = new Array(N)
 
    // set up new quadtree 
    //console.time("barnes-hut")
    let qt = new Quadtree(0, 0, enclosingExtent(this.solution))
    // add all the points making up the solution
    for (let p of this.solution) {
      qt.insert(p)
    }
    // non-recursive version
    /*
    let Z = 0
    for (let i = 0; i < N; i++) {
      let {qi:qi, Z:dZ} = traverseQuadtree(qt, this.solution[i], N)
      Frep[i] = qi
      Z += dZ
    }
    */
    // recursive version
    let Z = 0
    for (let i = 0; i < N; i++) {
      let result = {qi: new Point(0, 0), Z: 0}
      recurseQuadtree(qt, this.solution[i], result, this.theta)
      Frep[i] = result.qi
      Z += result.Z
    }
    for (let i = 0; i < N; i++) {
      Frep[i].divInPlace(Z)
    }
    //console.timeEnd("barnes-hut")
    return Frep
  }
  
  // quadratic implementation
  calcFrepQuadratic() {
    //console.time("quadratic calculation")
    let Z = 0
    let N = this.solution.length
    let qi = new Array(N)
  
    for (let i = 0; i < N; i++) {
      qi[i] = new Point(0, 0)
      for (let j = 0; j < N; j++) {
        let d = this.solution[i].distanceToPoint(this.solution[j])
        if (d > 0) {
          let dy = this.solution[i].subtract(this.solution[j])
          Z += 1/(1 + d)
          dy.divInPlace((1 + d)*(1 + d))
          qi[i].subtractInPlace(dy)
          //if (i == 2 && j < 10) console.log(dy, qi[i])
        }
      }
    }
  
    // normalize
    for (let i = 0; i < N; i++) {
      qi[i].divInPlace(Z)
    }
    //console.timeEnd("quadratic calculation")
    return qi
  }
}




// Helper function that implements Eq. (6) of van der Maaten 2014.
// The default tolerance of 1e-4 is low but likely sufficient
function  pJGivenI(dists_i, H_target, tolerance = 1e-4) {
  let l = dists_i.length
  let H = 0.0 // entropy
  let beta = 1.0 // beta = 2/sigma_i^2
  let beta_max = Number.MAX_VALUE
  let beta_min = Number.MIN_VALUE
  let max_tries = 50 // limits the number of tries in the binary search
  let count = 0
  let pj = Array(l)
  
  // binary search for appropriate beta value
  while (true) {
    // calculate entropy for given value of beta
    let sum = 0.0
    for (let k = 0; k < l; k++) {
      pj[k] = Math.exp(-dists_i[k].distance * beta)
      sum += pj[k]
    }
  
    H = 0.0;
    for (let k = 0; k < l; k++) {
      let ptemp
      if (sum == 0) {
        ptemp = 0
      } else {
        ptemp = pj[k] / sum
      }
      pj[k] = ptemp
      if (ptemp > 1e-7) {
        H -= ptemp * Math.log(ptemp)
      }
    }
    
    // stopping condition: sufficient accuracy or too many tries
    count += 1
    if (Math.abs(H - H_target) < tolerance || count >= max_tries) {
      break
    }
    // if we're not stopping yet, adjust beta based on result
    if (H > H_target) {
      // entropy too large, need to increase beta to make it smaller
      beta_min = beta // this is now the smallest possible beta
      if (beta_max === Number.MAX_VALUE) { 
        // if we have never moved the upper bound we keep increasing beta
        beta *= 2
      } else { // otherwise we set beta halfway between curent value and known max
        beta = (beta + beta_max) / 2 
      }
    } else {
      // opposite case; now we need to decrease beta
      beta_max = beta
      if (beta_min === Number.MIN_VALUE) {
        beta /= 2
      } else { 
        beta = (beta + beta_min) / 2
      }
    }
  }
//  console.log(beta)
  let pj_final = new Array(l)
  for (let k = 0; k < l; k++) {
    pj_final[k] = {j: dists_i[k].index, value: pj[k]}
  }
  return pj_final
}

// recurse over the quadtree and calculate the repulsive
// forces on the given point
// result is of the form: {qi:qijZ_squared, Z:Z}
function recurseQuadtree(qt, p, result, theta = 0.5) {
  // The current implementation ignores non-leaf quadtrees
  // that contain a point. This is a minor edge case, not worth
  // worrying about for the application cases I'm dealing with
  // here.
  if (qt.ntotal == 0) return
  
  if (qt.ntotal == 1) {
    let d = p.distanceToPoint(qt.point_sum)
    if (d > 0) { // skip distance = 0, which would indicate point is being compared against itself
      let dy = p.subtract(qt.point_sum) // (y_i - y_j)
      dy.divInPlace((1 + d) * (1 + d)) // (q_ij Z)^2 (y_i - y_j)
      result.qi.subtractInPlace(dy)
      result.Z += 1 / (1 + d)
    }
    return
  }
  
  // test whether the current node can stand in for all points it contains
  let center = qt.point_sum.div(qt.ntotal)
  let d = p.distanceToPoint(center)
  if ((2 * qt.half_dimension) < (theta * Math.sqrt(d))) {
    //console.log(theta)
    //console.log("Points summarized:", qt.ntotal)
    let dy = p.subtract(center) // (y_i - y_j)
    dy.divInPlace((1 + d) * (1 + d)) // (q_ij Z)^2 (y_i - y_j)
    result.qi.subtractInPlace(dy)
    result.Z += 1 / (1 + d)
  } else {
    recurseQuadtree(qt.top_left, p, result, theta)
    recurseQuadtree(qt.top_right, p, result, theta)
    recurseQuadtree(qt.bottom_left, p, result, theta)
    recurseQuadtree(qt.bottom_right, p, result, theta)
  }
}


// traverse the quadtree and calculate the repulsive
// forces on the given point
function traverseQuadtree(qt, p, N, theta = 0.5) {
  // if the quadtree were perfectly balanced, we should never need
  // more than log(N)/log(4) entries on the stack. We leave a little
  // room for imbalance.
  qtStack = new Array(Math.floor(2*Math.log(N)))
  
  let qijZ_squared = new Point(0, 0)
  let Z = 0
  let count = 0 // for debugging, keeps tracks of points encountered
  
  // TODO: This assumes that qt is not empty.
  qtStack.push(qt.top_left)
  qtStack.push(qt.top_right)
  qtStack.push(qt.bottom_left)
  qtStack.push(qt.bottom_right)
  
  while(true) {
    let current = qtStack.pop()
    if (current === undefined) {
      break;
    }
    // are we dealing with a leaf node?
    if (current.top_left === undefined) { // yes
      if (!(current.point === undefined)) {
        count += 1 // debug
        let d = p.distanceToPoint(current.point)
        if (d > 0) { // skip distance = 0, which would indicate point is being compared against itself
          let dy = p.subtract(current.point) // (y_i - y_j)
          dy.divInPlace((1 + d) * (1 + d)) // (q_ij Z)^2 (y_i - y_j)
          qijZ_squared.subtractInPlace(dy)
          Z += 1 / (1 + d)
        }
      }
    } else { // no
      // determine whether we need to descend further or 
      // can treat this node as representative
      let current_center = current.point_sum.div(current.ntotal)
      let d = p.distanceToPoint(current_center)
      if (2*qt.half_dimension < theta * d) {
        count += current.ntotal // debug
        // the point is sufficiently far away that we can use the summary
        let dy = p.subtract(current_center) // (y_i - y_j)
        dy.divInPlace((1 + d) * (1 + d)) // (q_ij Z)^2 (y_i - y_j)
        qijZ_squared.subtractInPlace(dy.mult(current.ntotal))
        Z += current.ntotal / (1 + d)
      } else {
        // check if the node contains a point; this can
        // happen if there are duplicated points
        if (!(current.point === undefined)) {
          let d = p.distanceToPoint(current.point)
          count += 1 // debug
          if (d > 0) { // skip distance = 0, which would indicate point is being compared against itself
            let dy = p.subtract(current.point) // (y_i - y_j)
            dy.divInPlace((1 + d) * (1 + d)) // (q_ij Z)^2 (y_i - y_j)
            qijZ_squared.subtractInPlace(dy)
            Z += 1 / (1 + d)
          }
        }
        // add subtrees to stack
        qtStack.push(current.top_left)
        qtStack.push(current.top_right)
        qtStack.push(current.bottom_left)
        qtStack.push(current.bottom_right)
      }
    }
  }
  
  return {qi:qijZ_squared, Z:Z}
}

// helper function that calculates q_{ij} Z for the given
// solution
function qijZ(i, j, solution) {
  // distance between points i and j
  d = solution[i].distanceToPoint(solution[j])
  return 1/(1 + d)
}

// Helper function that returns an array of points with random
// coordinates
function makePointArrayRandom(n, rnd, sd = 1e-4) {
  let out = new Array(n)
  
  for (let i = 0; i < n; i++) {
    out[i] = new Point(rnd.rNorm(0, sd), rnd.rNorm(0, sd))
  }
  
  return out
}

// Helper function that returns an array of points with 
// constant x and y values
function makePointArrayConstant(n, x = 0, y = 0) {
  let out = new Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = new Point(x, y)
  }
  return out
}

// Helper function that returns an array of points with 
// constant x and y values
function clonePointArray(points) {
  let out = new Array(points.length)
  
  for (let i = 0; i < points.length; i++) {
    out[i] = points[i].clone()
  }
  
  return out
}


// Calculates an enclosing extent centered around (0, 0),
// so really just calculates the half-width of a square
// centered around that point
function enclosingExtent(points) {
  let d = 0
  
  for (let p of points) {
    d = Math.max(d, Math.abs(p.x), Math.abs(p.y))
  }
  
  return d*1.1 // overinflate a little bit just to be safe
}

// helper function needed for adaptive learning rate
function sign(x) {
  return (x > 0 ? 1 : (x < 0 ? -1 : 0)) 
}

