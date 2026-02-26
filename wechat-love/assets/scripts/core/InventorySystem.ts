/**
 * 背包系统 - InventorySystem
 * 负责物品管理、礼物赠送、背包UI
 */

import { EventEmitter } from './EventEmitter';

// 物品类型
export enum ItemType {
    GIFT = 'gift',         // 礼物
    KEY = 'key',           // 关键物品
    CONSUMABLE = 'consumable', // 消耗品
    COLLECTIBLE = 'collectible', // 收藏品
}

// 物品数据
export interface ItemData {
    id: string;
    name: string;
    type: ItemType;
    description: string;
    icon?: string;
    rarity?: number;      // 稀有度 1-5
    price?: number;        // 价格
    usable?: boolean;      // 是否可使用
    consumable?: boolean;  // 是否消耗
}

// 背包物品实例
export interface InventoryItem {
    id: string;            // 物品ID
    count: number;         // 数量
    obtained: boolean;     // 是否获得过
    obtainedTime?: number; // 获得时间
}

// 物品配置
const ITEM_CONFIG: Record<string, ItemData> = {
    // 礼物
    'gift_flower': {
        id: 'gift_flower',
        name: '鲜花',
        type: ItemType.GIFT,
        description: '一束新鲜的鲜花',
        rarity: 1,
        price: 50,
    },
    'gift_chocolate': {
        id: 'gift_chocolate',
        name: '巧克力',
        type: ItemType.GIFT,
        description: '手工制作的巧克力',
        rarity: 2,
        price: 100,
    },
    'gift_book': {
        id: 'gift_book',
        name: '书籍',
        type: ItemType.GIFT,
        description: '一本珍贵的书籍',
        rarity: 2,
        price: 150,
    },
    'gift_game': {
        id: 'gift_game',
        name: '游戏盘',
        type: ItemType.GIFT,
        description: '最新发行的游戏',
        rarity: 2,
        price: 200,
    },
    'gift_necklace': {
        id: 'gift_necklace',
        name: '项链',
        type: ItemType.GIFT,
        description: '精致的银项链',
        rarity: 4,
        price: 500,
    },

    // 关键物品
    'key_student_id': {
        id: 'key_student_id',
        name: '学生证',
        type: ItemType.KEY,
        description: '圣樱学院的学生证',
    },
    'key_library_card': {
        id: 'key_library_card',
        name: '图书馆卡',
        type: ItemType.KEY,
        description: '可以进入图书馆的卡片',
    },
};

export class InventorySystem extends EventEmitter {
    private static _instance: InventorySystem;
    public static get instance(): InventorySystem {
        if (!InventorySystem._instance) {
            InventorySystem._instance = new InventorySystem();
        }
        return InventorySystem._instance;
    }

    // 背包物品
    private _items: Map<string, InventoryItem> = new Map();

    // 货币
    private _currency: number = 500;

    private constructor() {
        super();
    }

    /**
     * 初始化
     */
    init() {
        // 初始物品
        this.addItem('gift_flower', 3);
        this.addItem('gift_chocolate', 2);
        
        console.log('[InventorySystem] 初始化完成');
    }

    // ==================== 物品操作 ====================

    /**
     * 添加物品
     */
    addItem(itemId: string, count: number = 1): boolean {
        const config = ITEM_CONFIG[itemId];
        if (!config) {
            console.warn(`[InventorySystem] 未知物品: ${itemId}`);
            return false;
        }

        let item = this._items.get(itemId);

        if (item) {
            item.count += count;
        } else {
            item = {
                id: itemId,
                count,
                obtained: true,
                obtainedTime: Date.now(),
            };
            this._items.set(itemId, item);
        }

        console.log(`[InventorySystem] 添加物品: ${config.name} x${count}`);
        this.emit('itemAdded', { itemId, count, config });
        
        return true;
    }

    /**
     * 移除物品
     */
    removeItem(itemId: string, count: number = 1): boolean {
        const item = this._items.get(itemId);

        if (!item || item.count < count) {
            console.warn(`[InventorySystem] 物品不足: ${itemId}`);
            return false;
        }

        item.count -= count;

        if (item.count <= 0) {
            this._items.delete(itemId);
        }

        console.log(`[InventorySystem] 移除物品: ${itemId} x${count}`);
        this.emit('itemRemoved', { itemId, count });
        
        return true;
    }

    /**
     * 使用物品
     */
    useItem(itemId: string, target?: string): boolean {
        const item = this._items.get(itemId);
        const config = ITEM_CONFIG[itemId];

        if (!item || !config) {
            console.warn(`[InventorySystem] 物品不存在: ${itemId}`);
            return false;
        }

        if (!config.usable) {
            console.warn(`[InventorySystem] 物品不可使用: ${itemId}`);
            return false;
        }

        // 消耗物品
        if (config.consumable) {
            this.removeItem(itemId, 1);
        }

        console.log(`[InventorySystem] 使用物品: ${config.name}`);
        this.emit('itemUsed', { itemId, config, target });
        
        return true;
    }

    /**
     * 赠送礼物
     */
    giveGift(itemId: string, characterId: string): { success: boolean; favorDelta: number } {
        const config = ITEM_CONFIG[itemId];

        if (!config || config.type !== ItemType.GIFT) {
            console.warn(`[InventorySystem] 不是礼物: ${itemId}`);
            return { success: false, favorDelta: 0 };
        }

        if (!this.hasItem(itemId)) {
            console.warn(`[InventorySystem] 物品不足: ${itemId}`);
            return { success: false, favorDelta: 0 };
        }

        // 移除物品
        this.removeItem(itemId, 1);

        // 计算好感度变化
        const favorDelta = this.calculateGiftFavor(config, characterId);

        console.log(`[InventorySystem] 赠送礼物: ${config.name} -> ${characterId}, 好感度+${favorDelta}`);
        this.emit('giftGiven', { itemId, characterId, favorDelta });
        
        return { success: true, favorDelta };
    }

    /**
     * 计算礼物好感度
     */
    private calculateGiftFavor(config: ItemData, characterId: string): number {
        // 基础好感度
        const baseFavor = config.rarity ? config.rarity * 5 : 5;
        
        // 随机浮动
        const random = Math.random() * 0.4 - 0.2; // -20% ~ +20%
        
        return Math.floor(baseFavor * (1 + random));
    }

    // ==================== 查询操作 ====================

    /**
     * 检查是否有物品
     */
    hasItem(itemId: string): boolean {
        const item = this._items.get(itemId);
        return !!(item && item.count > 0);
    }

    /**
     * 获取物品数量
     */
    getItemCount(itemId: string): number {
        const item = this._items.get(itemId);
        return item?.count || 0;
    }

    /**
     * 获取物品配置
     */
    getItemConfig(itemId: string): ItemData | undefined {
        return ITEM_CONFIG[itemId];
    }

    /**
     * 获取所有物品
     */
    getAllItems(): InventoryItem[] {
        return Array.from(this._items.values());
    }

    /**
     * 获取背包物品列表（带配置信息）
     */
    getInventoryList(): Array<InventoryItem & { config: ItemData }> {
        const list: Array<InventoryItem & { config: ItemData }> = [];
        
        for (const item of this._items.values()) {
            const config = ITEM_CONFIG[item.id];
            if (config) {
                list.push({ ...item, config });
            }
        }
        
        return list;
    }

    /**
     * 获取指定类型的物品
     */
    getItemsByType(type: ItemType): Array<InventoryItem & { config: ItemData }> {
        return this.getInventoryList().filter(item => item.config.type === type);
    }

    // ==================== 货币操作 ====================

    /**
     * 获取货币
     */
    getCurrency(): number {
        return this._currency;
    }

    /**
     * 增加货币
     */
    addCurrency(amount: number): void {
        this._currency += amount;
        console.log(`[InventorySystem] 货币+${amount}, 当前: ${this._currency}`);
        this.emit('currencyChanged', { amount, total: this._currency });
    }

    /**
     * 消费货币
     */
    spendCurrency(amount: number): boolean {
        if (this._currency < amount) {
            console.warn(`[InventorySystem] 货币不足: 需要${amount}, 当前${this._currency}`);
            return false;
        }

        this._currency -= amount;
        console.log(`[InventorySystem] 货币-${amount}, 当前: ${this._currency}`);
        this.emit('currencyChanged', { amount: -amount, total: this._currency });
        
        return true;
    }

    // ==================== 存档相关 ====================

    /**
     * 导出数据
     */
    exportData(): any {
        return {
            items: Array.from(this._items.entries()),
            currency: this._currency,
        };
    }

    /**
     * 导入数据
     */
    importData(data: any): void {
        if (data.items) {
            this._items = new Map(data.items);
        }
        if (data.currency !== undefined) {
            this._currency = data.currency;
        }
    }

    /**
     * 重置
     */
    reset(): void {
        this._items.clear();
        this._currency = 500;
        
        // 初始物品
        this.addItem('gift_flower', 3);
        this.addItem('gift_chocolate', 2);
        
        console.log('[InventorySystem] 已重置');
    }
}

export const Inventory = InventorySystem.instance;
