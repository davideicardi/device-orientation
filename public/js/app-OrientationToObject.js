/**
 * Code based on:
 *  https://github.com/mrdoob/three.js/blob/8e2d3a8cbc8a7b85db9070b443ad4cd27c248f6f/examples/js/controls/DeviceOrientationControls.js
 *
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

var OrientationToObject = function(object) {

    this.object = object;
    this.object.rotation.reorder("ZXY");

    this.deviceOrientation = {};
    this.screenOrientation = 0;

    // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''


    //var zee = new THREE.Vector3(0, 0, 1);

    this.euler = new THREE.Euler();

    //var q0 = new THREE.Quaternion();

    //this.q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

};

OrientationToObject.prototype.setObjectQuaternion = function(quaternion, alpha, beta, gamma, orient) {

    this.euler.set(beta, alpha, -gamma, 'ZXY'); // 'ZXY' for the device, but 'YXZ' for us (for camera)

    quaternion.setFromEuler(this.euler); // orient the device

    //quaternion.multiply(this.q1); // camera looks out the back of the device, not the top

    //quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation

};

OrientationToObject.prototype.update = function(orientation) {

    var alpha = THREE.Math.degToRad(orientation.alpha); // Z
    var beta = THREE.Math.degToRad(orientation.beta); // X'
    var gamma = THREE.Math.degToRad(orientation.gamma); // Y''

    this.setObjectQuaternion(this.object.quaternion, alpha, beta, gamma);

};

window.OrientationToObject = OrientationToObject;