/**
 * 角色系统 - CharacterSystem
 * 负责角色数据管理、立绘显示、好感度系统
 */

import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { EventEmitter } from './EventEmitter';

const { ccclass, property } = _decorator;

// 角色数据
export interface CharacterData {
    id: string;
    name: string;
    title?: string;
    sprites: Record<string, string>;  // 姿态对应资源
    favor: number;
    maxFavor: number;
    unlocked: boolean;
    endings: string[];
    events: string[];
}

// 角色姿态
export enum CharacterPose {
    NORMAL = 'normal',
    SMILE = 'smile',
    BLUSH = 'blush',
    ANGRY = 'angry',
    SAD = 'sad',
    SURPRISE = 'surprise',
    THINK = 'think',
    LAUGH = 'laugh',
}

// 角色位置
export enum CharacterPosition {
    LEFT = 'left',
    CENTER = 'center',
    RIGHT = 'right',
}

// 角色显示信息
export interface CharacterDisplayInfo {
    id: string;
    pose: CharacterPose;
    position: CharacterPosition;
    fade?: boolean;
    slide?: boolean;
}

@ccclass('CharacterSystem')
export class CharacterSystem extends EventEmitter {
    private static _instance: CharacterSystem;
    public static get instance(): CharacterSystem {
        if (!CharacterSystem._instance) {
            CharacterSystem._instance = new CharacterSystem();
        }
        return CharacterSystem._instance;
    }

    // 角色数据映射
    private _characters: Map<string, CharacterData> = new Map();
    
    // 立绘节点映射
    private _characterNodes: Map<string, Node> = new Map();
    
    // 资源缓存
    private _spriteCache: Map<string, SpriteFrame> = new Map();

    // 配置数据
    private _characterConfig: any = null;

    private constructor() {
        super();
    }

    /**
     * 初始化角色系统
     */
    async init() {
        // 加载角色配置
        await this.loadCharacterConfig();
        
        // 初始化角色数据
        this.initializeCharacters();
        
        console.log('[CharacterSystem] 初始化完成');
    }

    /**
     * 加载角色配置
     */
    private async loadCharacterConfig() {
        // TODO: 从JSON加载配置
        // const config = await Resources.load('data/game-config/characters', JSON);
        // this._characterConfig = config;
        
        // 使用模拟数据
        this._characterConfig = {
            characters: [
                {
                    id: 'heroine_1',
                    name: '林雨晴',
                    title: '学生会会长',
                    sprites: {
                        normal: 'char_001_normal',
                        smile: 'char_001_smile',
                        blush: 'char_001_blush',
                        angry: 'char_001_angry',
                        sad: 'char_001_sad',
                        surprise: 'char_001_surprise',
                        think: 'char_001_think',
                        laugh: 'char_001_laugh',
                    },
                    maxFavor: 1000,
                    defaultFavor: 0,
                },
                {
                    id: 'heroine_2',
                    name: '苏小晚',
                    title: '元气学妹',
                    sprites: {
                        normal: 'char_002_normal',
                        smile: 'char_002_smile',
                        blush: 'char_002_blush',
                        angry: 'char_002_angry',
                        sad: 'char_002_sad',
                        surprise: 'char_002_surprise',
                        think: 'char_002_think',
                        laugh: 'char_002_laugh',
                    },
                    maxFavor: 1000,
                    defaultFavor: 0,
                },
                {
                    id: 'heroine_3',
                    name: '沈墨寒',
                    title: '冰山校花',
                    sprites: {
                        normal: 'char_003_normal',
                        smile: 'char_003_smile',
                        blush: 'char_003_blush',
                        angry: 'char_003_angry',
                        sad: 'char_003_sad',
                        surprise: 'char_003_surprise',
                        think: 'char_003_think',
                        laugh: 'char_003_laugh',
                    },
                    maxFavor: 1000,
                    defaultFavor: 0,
                },
            ],
        };
    }

    /**
     * 初始化角色数据
     */
    private initializeCharacters() {
        if (!this._characterConfig) return;

        for (const char of this._characterConfig.characters) {
            const characterData: CharacterData = {
                id: char.id,
                name: char.name,
                title: char.title,
                sprites: char.sprites,
                favor: char.defaultFavor || 0,
                maxFavor: char.maxFavor || 1000,
                unlocked: false,
                endings: [],
                events: [],
            };
            this._characters.set(char.id, characterData);
        }
    }

    /**
     * 获取角色数据
     */
    getCharacter(characterId: string): CharacterData | undefined {
        return this._characters.get(characterId);
    }

    /**
     * 获取所有已解锁角色
     */
    getUnlockedCharacters(): CharacterData[] {
        return Array.from(this._characters.values()).filter(c => c.unlocked);
    }

    /**
     * 解锁角色
     */
    unlockCharacter(characterId: string): boolean {
        const character = this._characters.get(characterId);
        if (!character || character.unlocked) return false;

        character.unlocked = true;
        console.log(`[CharacterSystem] 解锁角色: ${character.name}`);
        
        this.emit('characterUnlocked', character);
        return true;
    }

    /**
     * 更改好感度
     */
    changeFavor(characterId: string, delta: number): number {
        const character = this._characters.get(characterId);
        if (!character) return 0;

        const oldFavor = character.favor;
        character.favor = Math.max(0, Math.min(character.maxFavor, character.favor + delta));
        
        const actualChange = character.favor - oldFavor;
        
        if (actualChange !== 0) {
            console.log(`[CharacterSystem] 好感度变化: ${character.name} ${actualChange > 0 ? '+' : ''}${actualChange} (${character.favor}/${character.maxFavor})`);
            
            this.emit('favorChanged', {
                characterId,
                characterName: character.name,
                delta: actualChange,
                newValue: character.favor,
            });

            // 检查好感度等级变化
            this.checkFavorLevel(character);
        }

        return actualChange;
    }

    /**
     * 好感度等级
     */
    getFavorLevel(characterId: string): number {
        const character = this._characters.get(characterId);
        if (!character) return 0;

        const percent = character.favor / character.maxFavor;
        
        if (percent >= 0.85) return 7;  // 命中注定
        if (percent >= 0.70) return 6;  // 恋人
        if (percent >= 0.55) return 5;  // 亲密
        if (percent >= 0.40) return 4;  // 好友
        if (percent >= 0.25) return 3;  // 熟人
        if (percent >= 0.10) return 2;  // 认识
        return 1;  // 陌生人
    }

    /**
     * 好感度等级名称
     */
    getFavorLevelName(characterId: string): string {
        const level = this.getFavorLevel(characterId);
        const names = ['陌生人', '认识', '熟人', '朋友', '好友', '亲密', '恋人', '命中注定'];
        return names[level - 1] || '陌生人';
    }

    /**
     * 检查好感度等级变化
     */
    private checkFavorLevel(character: CharacterData) {
        const newLevel = this.getFavorLevel(character.id);
        const oldLevel = this.getFavorLevel(character.id); // TODO: 需要存储旧等级
        
        if (newLevel !== oldLevel) {
            this.emit('favorLevelUp', {
                characterId: character.id,
                characterName: character.name,
                newLevel,
                levelName: this.getFavorLevelName(character.id),
            });
        }
    }

    /**
     * 检查是否满足结局条件
     */
    checkEndingCondition(endingId: string, characterId: string): boolean {
        const character = this._characters.get(characterId);
        if (!character) return false;

        // TODO: 从配置中读取结局条件并检查
        // 简化版本：好感度 >= 800 触发好结局
        return character.favor >= 800;
    }

    /**
     * 解锁结局
     */
    unlockEnding(characterId: string, endingId: string): boolean {
        const character = this._characters.get(characterId);
        if (!character) return false;

        if (!character.endings.includes(endingId)) {
            character.endings.push(endingId);
            console.log(`[CharacterSystem] 解锁结局: ${character.name} - ${endingId}`);
            this.emit('endingUnlocked', { characterId, endingId });
            return true;
        }
        return false;
    }

    /**
     * 记录事件
     */
    recordEvent(characterId: string, eventId: string): boolean {
        const character = this._characters.get(characterId);
        if (!character) return false;

        if (!character.events.includes(eventId)) {
            character.events.push(eventId);
            this.emit('eventRecorded', { characterId, eventId });
            return true;
        }
        return false;
    }

    // ==================== 立绘显示相关 ====================

    /**
     * 注册角色立绘节点
     */
    registerCharacterNode(characterId: string, node: Node) {
        this._characterNodes.set(characterId, node);
        node.active = false;
    }

    /**
     * 显示角色立绘
     */
    async showCharacter(displayInfo: CharacterDisplayInfo) {
        const { id, pose, position, fade = true, slide = true } = displayInfo;
        
        const character = this._characters.get(id);
        if (!character) {
            console.warn(`[CharacterSystem] 未知角色: ${id}`);
            return;
        }

        // 确保角色已解锁
        if (!character.unlocked) {
            this.unlockCharacter(id);
        }

        const node = this._characterNodes.get(id);
        if (!node) {
            console.warn(`[CharacterSystem] 未找到角色节点: ${id}`);
            return;
        }

        // 获取对应姿态的资源
        const spriteName = character.sprites[pose] || character.sprites.normal;
        
        // 加载资源
        // TODO: 异步加载立绘资源
        // const spriteFrame = await this.loadSprite(spriteName);
        
        // 设置位置
        const posX = this.getPositionX(position);
        const targetPos = new Vec3(posX, 0, 0);

        // 播放动画
        node.active = true;
        
        if (slide) {
            // 滑入动画
            const startPos = new Vec3(position === CharacterPosition.LEFT ? -200 : 200, 0, 0);
            node.setPosition(startPos);
            
            tween(node)
                .to(0.3, { position: targetPos })
                .easing('backOut')
                .start();
        } else if (fade) {
            // 淡入动画
            node.setPosition(targetPos);
            // TODO: 使用Opacity实现淡入
        } else {
            node.setPosition(targetPos);
        }

        console.log(`[CharacterSystem] 显示角色: ${character.name} - ${pose} @ ${position}`);
        
        this.emit('characterShown', displayInfo);
    }

    /**
     * 隐藏角色立绘
     */
    hideCharacter(characterId: string, fade: boolean = true) {
        const node = this._characterNodes.get(characterId);
        if (!node) return;

        if (fade) {
            tween(node)
                .to(0.2, { position: new Vec3(node.position.x + 100, 0, 0) })
                .call(() => {
                    node.active = false;
                })
                .start();
        } else {
            node.active = false;
        }

        this.emit('characterHidden', characterId);
    }

    /**
     * 隐藏所有角色
     */
    hideAllCharacters() {
        for (const [id] of this._characterNodes) {
            this.hideCharacter(id);
        }
    }

    /**
     * 获取位置X坐标
     */
    private getPositionX(position: CharacterPosition): number {
        switch (position) {
            case CharacterPosition.LEFT: return -300;
            case CharacterPosition.CENTER: return 0;
            case CharacterPosition.RIGHT: return 300;
            default: return 0;
        }
    }

    /**
     * 加载立绘资源
     */
    private async loadSprite(spriteName: string): Promise<SpriteFrame | null> {
        // 检查缓存
        if (this._spriteCache.has(spriteName)) {
            return this._spriteCache.get(spriteName)!;
        }

        // TODO: 异步加载资源
        // const spriteFrame = await Resources.load(`resources/characters/${spriteName}`, SpriteFrame);
        // this._spriteCache.set(spriteName, spriteFrame);
        // return spriteFrame;

        return null;
    }

    // ==================== 数据相关 ====================

    /**
     * 导出角色数据（用于存档）
     */
    exportData(): Record<string, any> {
        const data: Record<string, any> = {};
        
        for (const [id, char] of this._characters) {
            data[id] = {
                favor: char.favor,
                unlocked: char.unlocked,
                endings: char.endings,
                events: char.events,
            };
        }
        
        return data;
    }

    /**
     * 导入角色数据（用于读档）
     */
    importData(data: Record<string, any>) {
        for (const [id, charData] of Object.entries(data)) {
            const character = this._characters.get(id);
            if (character) {
                character.favor = charData.favor;
                character.unlocked = charData.unlocked;
                character.endings = charData.endings || [];
                character.events = charData.events || [];
            }
        }
    }

    /**
     * 重置所有角色数据
     */
    resetAll() {
        this.reset();
    }

    /**
     * 重置（供外部调用）
     */
    reset() {
        for (const [, char] of this._characters) {
            char.favor = 0;
            char.unlocked = false;
            char.endings = [];
            char.events = [];
        }
        
        this.hideAllCharacters();
        console.log('[CharacterSystem] 重置完成');
    }
}
