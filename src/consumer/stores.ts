import fs from 'fs'
import { BlockModel, BlockStates, ItemModel } from './types'
import { VersionedStore } from './versionedStore'

export type BlockStatesStore = VersionedStore<BlockStates>
export type BlockModelsStore = VersionedStore<BlockModel & ItemModel>
export const blockstatesStore = new VersionedStore<BlockStates>()
export const modelsStore = new VersionedStore<BlockModel & ItemModel>()
blockstatesStore.inclusive = false
modelsStore.inclusive = false

export const getLoadedBlockstatesStore = (data: { blockstates }) => {
    const blockstatesStore = new VersionedStore<BlockStates>()
    blockstatesStore.inclusive = false
    blockstatesStore.loadData(data.blockstates)
    return blockstatesStore
}

export const getLoadedModelsStore = (data: { models }) => {
    const modelsStore = new VersionedStore<BlockModel & ItemModel>()
    modelsStore.inclusive = false
    modelsStore.loadData(data.models)
    return modelsStore
}
