// todo
export class ItemsProvider {
    constructor(public version: string, public itemsModelsLatest: Record<string, string>) {
    }

    getItemTexture(itemName: string) {
        // return this.itemsAtlases[this.version][itemName]
    }
}
