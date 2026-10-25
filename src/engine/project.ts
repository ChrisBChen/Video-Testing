import * as THREE from "three";
export interface Cam { pos: [number, number, number]; target: [number, number, number]; fov: number }
const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 500);
const v = new THREE.Vector3();
/** Project a world point to 1080x1920 screen px with the same camera the 3D scene uses (for DOM labels). */
export function project(c: Cam, p: [number, number, number]) {
  cam.fov = c.fov; cam.aspect = 1080 / 1920; cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.target);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  v.set(...p).project(cam);
  return { x: (v.x * 0.5 + 0.5) * 1080, y: (-v.y * 0.5 + 0.5) * 1920, visible: v.z < 1 && v.z > -1 };
}
