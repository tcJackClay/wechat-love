/**
 * 资源加载器 - ResourceManager
 * 负责游戏资源的加载、缓存与管理
 */

import { EventEmitter } from './EventEmitter';

export enum ResourceType {
    IMAGE = 'image',
    AUDIO = 'audio',
    SPRITE_FRAME = 'sprite_frame',
    PREFAB = 'prefab',
    JSON = 'json',
    TEXT = 'text',
}

export interface ResourceInfo {
    name: string;
    type: ResourceType;
    url: string;
    loaded: boolean;
    refCount: number;
}

export class ResourceManager extends EventEmitter {
    private static _instance: ResourceManager;
    public static get instance(): ResourceManager {
        if (!ResourceManager._instance) {
            ResourceManager._instance = new ResourceManager();
        }
        return ResourceManager._instance;
    }

    // 资源缓存
    private _cache: Map<string, any> = new Map();
    
    // 资源信息
    private _resources: Map<string, ResourceInfo> = new Map();

    // 加载中的Promise
    private _loadingPromises: Map<string, Promise<any>> = new Map();

    // 资源路径配置
    private _paths: Record<ResourceType, string> = {
        [ResourceType.IMAGE]: 'resources/images/',
        [ResourceType.AUDIO]: 'resources/audio/',
        [ResourceType.SPRITE_FRAME]: 'resources/characters/',
        [ResourceType.PREFAB]: 'prefabs/',
        [ResourceType.JSON]: 'resources/data/',
        [ResourceType.TEXT]: 'resources/text/',
    };

    private constructor() {}

    /**
     * 初始化
     */
    init() {
        console.log('[ResourceManager] 初始化完成');
    }

    /**
     * 加载资源
     */
    async load<T>(name: string, type: ResourceType): Promise<T> {
        const key = `${type}:${name}`;

        // 检查缓存
        if (this._cache.has(key)) {
            const resource = this._cache.get(key);
            resource.refCount++;
            return resource.data as T;
        }

        // 检查是否正在加载
        if (this._loadingPromises.has(key)) {
            return this._loadingPromises.get(key) as Promise<T>;
        }

        // 开始加载
        const promise = this.doLoad<T>(name, type);
        this._loadingPromises.set(key, promise);

        try {
            const data = await promise;
            
            // 存入缓存
            this._cache.set(key, {
                data,
                type,
                name,
                loaded: true,
                refCount: 1,
            });

            // 更新资源信息
            this._resources.set(key, {
                name,
                type,
                url: this._paths[type] + name,
                loaded: true,
                refCount: 1,
            });

            this._loadingPromises.delete(key);
            
            this.emit('resourceLoaded', { name, type });
            return data;
        } catch (error) {
            this._loadingPromises.delete(key);
            console.error(`[ResourceManager] 加载失败: ${name}`, error);
            throw error;
        }
    }

    /**
     * 执行加载
     */
    private async doLoad<T>(name: string, type: ResourceType): Promise<T> {
        const url = this._paths[type] + name;
        
        console.log(`[ResourceManager] 加载资源: ${url}`);
        
        // 根据类型使用不同的加载方式
        switch (type) {
            case ResourceType.JSON:
                // return await Resources.load(url, JSON) as T;
                return {} as T;
            
            case ResourceType.IMAGE:
                // return await Resources.load(url, Texture2D) as T;
                return {} as T;
            
            case ResourceType.SPRITE_FRAME:
                // return await Resources.load(url, SpriteFrame) as T;
                return {} as T;
            
            case ResourceType.AUDIO:
                // return await Resources.load(url, AudioClip) as T;
                return {} as T;
            
            case ResourceType.PREFAB:
                // return await Resources.load(url, Prefab) as T;
                return {} as T;
            
            default:
                return {} as T;
        }
    }

    /**
     * 批量加载
     */
    async loadBatch<T>(resources: { name: string; type: ResourceType }[]): Promise<T[]> {
        const promises = resources.map(r => this.load<T>(r.name, r.type));
        return Promise.all(promises);
    }

    /**
     * 预加载
     */
    async preload(names: string[], type: ResourceType): Promise<void> {
        const promises = names.map(name => this.load(name, type));
        await Promise.all(promises);
        console.log(`[ResourceManager] 预加载完成: ${names.length}个${type}资源`);
    }

    /**
     * 获取缓存资源
     */
    get<T>(name: string, type: ResourceType): T | null {
        const key = `${type}:${name}`;
        const cached = this._cache.get(key);
        return cached ? cached.data as T : null;
    }

    /**
     * 检查资源是否存在
     */
    has(name: string, type: ResourceType): boolean {
        const key = `${type}:${name}`;
        return this._cache.has(key);
    }

    /**
     * 释放资源
     */
    release(name: string, type: ResourceType, force: boolean = false): void {
        const key = `${type}:${name}`;
        const cached = this._cache.get(key);

        if (!cached) return;

        cached.refCount--;

        if (force || cached.refCount <= 0) {
            // TODO: 释放资源
            this._cache.delete(key);
            this._resources.delete(key);
            console.log(`[ResourceManager] 释放资源: ${name}`);
        }
    }

    /**
     * 释放所有未使用资源
     */
    releaseUnused(): void {
        let count = 0;
        
        for (const [key, cached] of this._cache) {
            if (cached.refCount <= 0) {
                this._cache.delete(key);
                count++;
            }
        }

        console.log(`[ResourceManager] 释放未使用资源: ${count}个`);
    }

    /**
     * 清空缓存
     */
    clearCache(): void {
        this._cache.clear();
        console.log('[ResourceManager] 清空缓存');
    }

    /**
     * 获取缓存信息
     */
    getCacheInfo(): { count: number; types: Record<string, number> } {
        const types: Record<string, number> = {};
        
        for (const cached of this._cache.values()) {
            const typeName = ResourceType[cached.type];
            types[typeName] = (types[typeName] || 0) + 1;
        }

        return {
            count: this._cache.size,
            types,
        };
    }
}

export const Resources = ResourceManager.instance;
