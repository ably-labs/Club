import {Object3D} from "three";

export default class ResourceTracker {
    private readonly resources: Set<any>;

    constructor() {
        this.resources = new Set();
    }


    dispose() {
        this.resources.forEach((resource) => {
            if (resource instanceof Object3D)  {
                if (resource.parent) {
                    resource.parent.remove(resource);
                }
            }
            if (resource.dispose) resource.dispose()
        })
        this.resources.clear();
    }

    track(resource: any) {
        if (resource.dispose || resource instanceof Object3D) {
            this.resources.add(resource)
        }
    }
}