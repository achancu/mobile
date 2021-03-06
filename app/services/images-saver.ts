import { path, knownFolders } from "tns-core-modules/file-system";
import { getPathTimestamp } from "../utilities";
import { ImageSource } from "tns-core-modules/image-source";
import { IncomingImage, SavedImage } from "./types";

export default class ImagesSaver {
    public saveImage(incoming: IncomingImage): Promise<SavedImage> {
        const folder = knownFolders.documents().getFolder("media/images");
        const destination = path.join(folder.path, getPathTimestamp(new Date()) + ".jpg");
        return ImageSource.fromAsset(incoming.source).then(imageSource => {
            if (!imageSource.saveToFile(destination, "jpg")) {
                throw new Error("save failed");
            }
            return new SavedImage(destination, incoming.source);
        });
    }

    public fromFile(path: string): Promise<SavedImage> {
        return ImageSource.fromFile(path).then(source => {
            return new SavedImage(path, source);
        });
    }
}
