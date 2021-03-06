import { promiseAfter } from "../utilities";
// import { Color } from "tns-core-modules/color";

export function pressed(view: any): Promise<any> {
    if (view) {
        const cn = view.className;
        view.className = cn + " pressed";
        return promiseAfter(500).then(() => (view.className = cn));
    }
    return Promise.resolve();
}
