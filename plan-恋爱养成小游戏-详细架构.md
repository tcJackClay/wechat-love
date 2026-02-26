# 恋爱养成微信小游戏 - 详细游戏架构

**引擎**: Cocos Creator 3.x  
**目标平台**: 微信小游戏  
**版本**: v1.0

---

## 一、项目架构总览

```
Project/
├── assets/
│   ├── scenes/           # 场景文件
│   │   ├── Boot/         # 启动场景
│   │   ├── MainMenu/    # 主菜单
│   │   ├── Game/        # 游戏主场景
│   │   └── CGView/      # CG画廊场景
│   │
│   ├── scripts/         # 脚本目录
│   │   ├── core/        # 核心系统
│   │   ├── game/        # 游戏逻辑
│   │   ├── ui/          # UI组件
│   │   └── utils/       # 工具类
│   │
│   ├── prefabs/         # 预制体
│   │   ├── characters/  # 角色预制
│   │   ├── dialogs/     # 对话框预制
│   │   └── effects/     # 特效预制
│   │
│   ├── resources/       # 资源目录
│   │   ├── characters/  # 角色图片
│   │   ├── backgrounds/# 背景图
│   │   ├── bgm/         # 背景音乐
│   │   └── sfx/         # 音效
│   │
│   └── data/            # 数据文件
│       ├── json/        # 配置JSON
│       └── script/      # 剧情脚本
│
└── build/               # 构建输出
```

---

## 二、核心系统架构

### 2.1 核心系统模块

```
┌─────────────────────────────────────────────────────────┐
│                    GameManager                          │
│  (游戏主控：场景切换、存档管理、全局状态)                  │
└─────────────────────────────────────────────────────────┘
         ▲           ▲           ▲           ▲
         │           │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
    │Story    │ │Character│ │Save/    │ │Audio    │
    │System   │ │System   │ │Load     │ │System   │
    │剧情系统  │ │角色系统  │ │存档系统  │ │音频系统  │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 2.2 核心类设计

#### GameManager (游戏主控)
```typescript
class GameManager {
    // 单例模式
    static getInstance(): GameManager;

    // 场景管理
    loadScene(sceneName: string): void;
    loadBattleScene(): void;

    // 游戏状态
    gameState: GameState;           // 状态机：MENU/PLAYING/PAUSE/DIALOG
    currentChapter: number;         // 当前章节
    isAutoSave: boolean;            // 自动存档开关

    // 全局数据
    playerData: PlayerData;         // 玩家数据
    settings: GameSettings;        // 游戏设置
}
```

#### StorySystem (剧情系统)
```typescript
class StorySystem {
    // 剧情控制
    playChapter(chapterId: string): void;
    playNode(nodeId: string): void;         // 播放指定节点
    selectChoice(choiceIndex: number): void;// 处理选项

    // 状态查询
    getCurrentNode(): StoryNode;
    getChoices(): ChoiceData[];

    // 好感度
    changeFavor(characterId: string, delta: number): void;
    getFavor(characterId: string): number;
}
```

#### CharacterSystem (角色系统)
```typescript
class CharacterSystem {
    // 角色管理
    characters: Map<string, CharacterData>;

    // 立绘控制
    showCharacter(charId: string, pose: string): void;
    hideCharacter(charId: string): void;
    playEmotion(charId: string, emotion: string): void;

    // 角色状态
    getCharacter(charId: string): CharacterData;
    unlockCharacter(charId: string): void;
}
```

#### SaveLoadSystem (存档系统)
```typescript
class SaveLoadSystem {
    // 存档槽位
    MAX_SLOTS: number = 6;

    // 存档操作
    save(slot: number, data: SaveData): boolean;
    load(slot: number): SaveData;
    autoSave(): boolean;

    // 存档数据
    getSaveInfo(): SaveInfo[];  // 获取所有存档简要信息
    deleteSave(slot: number): boolean;
}
```

#### AudioSystem (音频系统)
```typescript
class AudioSystem {
    // 音乐控制
    playBGM(bgmName: string, fade?: boolean): void;
    stopBGM(fade?: boolean): void;

    // 音效
    playSFX(sfxName: string): void;

    // 设置
    setMusicVolume(volume: number): void;
    setSFXVolume(volume: number): void;
}
```

---

## 三、剧情系统详细设计

### 3.1 剧情数据结构

```typescript
// 剧情节点
interface StoryNode {
    id: string;              // 节点ID
    type: NodeType;          // 节点类型
    speaker?: string;        // 说话者ID
    content: string;         // 文本内容
    background?: string;     // 背景图
    character?: CharacterDisplay; // 角色显示
    choices?: ChoiceData[];  // 选项列表
    next?: string;           // 下一节点ID
    conditions?: Condition[];// 触发条件
    effects?: Effect[];      // 节点效果
}

enum NodeType {
    DIALOG = "dialog",       // 对话
    NARRATION = "narration", // 旁白
    CHOICE = "choice",       // 选择
    BRANCH = "branch",       // 条件分支
    EVENT = "event",         // 事件
    END = "end"              // 结束
}

// 角色显示
interface CharacterDisplay {
    id: string;              // 角色ID
    pose: string;             // 姿态 (normal/smile/angry...)
    position: Position;      // 位置 (left/center/right)
    fade?: FadeType;         // 淡入淡出
}

// 选择数据
interface ChoiceData {
    id: string;
    text: string;
    next: string;             // 跳转节点
    conditions?: Condition[];// 显示条件
    effects?: Effect[];      // 选择效果
    favorChange?: {[charId: string]: number}; // 好感变化
}

// 条件
interface Condition {
    type: ConditionType;
    target: string;
    value: any;
}

enum ConditionType {
    FAVOR = "favor",         // 好感度
    FLAG = "flag",           // 标志位
    CHAPTER = "chapter",     // 章节
    ITEM = "item"            // 物品
}

// 效果
interface Effect {
    type: EffectType;
    value: any;
}

enum EffectType {
    FAVOR = "favor",         // 好感度
    FLAG = "flag",           // 设置标志位
    ITEM = "item",           // 物品
    SCENE = "scene",         // 切换场景
    UNLOCK = "unlock"        // 解锁内容
}
```

### 3.2 剧情流程图

```
[开始] → [序章] → [第一章] → [第二章] → ... → [结局]
                 ↓           ↓
              [选项A]      [选项A]
                 ↓           ↓
            [分支剧情]    [分支剧情]
```

### 3.3 剧情脚本示例 (JSON格式)

```json
{
    "chapterId": "ch01",
    "title": "第一章 - 命运的邂逅",
    "nodes": {
        "ch01_start": {
            "type": "dialog",
            "background": "bg_school",
            "character": {
                "id": " heroine_1",
                "pose": "normal",
                "position": "center"
            },
            "speaker": "heroine_1",
            "content": "今天的天气真好啊...",
            "next": "ch01_02"
        },
        "ch01_02": {
            "type": "choice",
            "content": "主人公应该如何回应？",
            "choices": [
                {
                    "id": "choice_1",
                    "text": "上前打招呼",
                    "next": "ch01_03a",
                    "favorChange": {"heroine_1": 5}
                },
                {
                    "id": "choice_2",
                    "text": "默默观察",
                    "next": "ch01_03b",
                    "favorChange": {"heroine_1": 0}
                }
            ]
        }
    }
}
```

---

## 四、角色系统设计

### 4.1 角色数据结构

```typescript
interface CharacterData {
    id: string;                    // 唯一ID
    name: string;                  // 名称
    title?: string;                // 称号

    // 立绘资源
    sprites: {
        normal: string;            // 正常
        smile: string;             // 微笑
        blush: string;             // 脸红
        angry: string;             // 生气
        sad: string;               // 伤心
        surprise: string;          // 惊讶
        [key: string]: string;     // 其他姿态
    };

    // 角色属性
    favor: number;                 // 好感度 (0-1000)
    maxFavor: number = 1000;       // 最高好感度

    // 剧情相关
    unlocked: boolean;             // 是否解锁
    endings: string[];             // 已解锁结局
    events: string[];              // 已触发事件
}

enum CharacterPose {
    NORMAL = "normal",
    SMILE = "smile",
    BLUSH = "blush",
    ANGRY = "angry",
    SAD = "sad",
    SURPRISE = "surprise",
    THINK = "think",
    LAUGH = "laugh"
}

enum CharacterPosition {
    LEFT = "left",
    CENTER = "center",
    RIGHT = "right"
}
```

### 4.2 角色立绘显示规则

```
显示层级 (Z-Order):
├── 300 - 立绘层 (Character)
├── 200 - 对话框层 (Dialog)
├── 100 - 背景层 (Background)
└── 0   - 底层 (Base)

立绘过渡效果:
- 淡入淡出: fade (500ms)
- 滑动: slide (300ms)
- 缩放: scale (300ms)
```

---

## 五、UI系统设计

### 5.1 UI层级结构

```
Canvas
├── ScreenAdapt              # 屏幕适配层
│   ├── SafeArea             # 安全区域
│   │
│   ├── Background          # 背景层
│   │
│   ├── GameLayer           # 游戏层
│   │   ├── CharacterRoot   # 角色根节点
│   │   ├── DialogRoot      # 对话框根节点
│   │   │
│   │   └── DialogBox       # 对话框组件
│   │       ├── SpeakerName # 说话者名称
│   │       ├── Content     # 对话内容
│   │       ├── Avatar      # 立绘
│   │       └── ChoicePanel # 选项面板
│   │
│   ├── HUDLayer            # HUD层 (血条/金币等)
│   │
│   ├── MenuLayer           # 菜单层
│   │   ├── MainMenu        # 主菜单
│   │   ├── SaveLoadMenu    # 存档菜单
│   │   ├── SettingsMenu    # 设置菜单
│   │   └── CGallery        # CG画廊
│   │
│   └── TopLayer            # 顶层
        ├── Loading         # 加载界面
        ├── Toast           # 提示信息
        └── Confirm         # 确认对话框
```

### 5.2 核心UI组件

#### DialogBox (对话框)
```typescript
// 属性
- speakerName: string        // 说话者名称
- content: string           // 对话内容
- avatar: string            // 立绘资源
- choices: ChoiceData[]    // 选项列表

// 打字机效果
- typingSpeed: number = 50  // 打字速度 (ms/字)
- isSkipping: boolean       // 是否快进

// 方法
show(node: StoryNode): void
hide(): void
next(): void
selectChoice(index: number): void
```

#### ChoicePanel (选项面板)
```typescript
// 属性
- choices: ChoiceData[]     // 选项数据
- selectedIndex: number     // 选中索引

// 布局
- direction: Vertical       // 垂直排列
- spacing: number = 20     // 间距

// 方法
show(choices: ChoiceData[]): void
hide(): void
getSelection(): number
```

#### SaveSlot (存档槽位)
```typescript
// 属性
- slotIndex: number         // 槽位编号
- thumbnail: string         // 缩略图
- chapterName: string       // 章节名
- playTime: string         // 游玩时间
- saveDate: string          // 保存日期
- isEmpty: boolean         // 是否为空

// 状态
- STATE_EMPTY = "empty"
- STATE_SAVED = "saved"
- STATE_CURRENT = "current" // 当前进度
```

---

## 六、数据存储设计

### 6.1 存档数据结构

```typescript
interface SaveData {
    // 存档信息
    slot: number;                  // 槽位
    version: string;                // 游戏版本
    saveTime: number;               // 保存时间戳

    // 进度数据
    chapter: string;                // 当前章节
    node: string;                  // 当前节点

    // 角色状态
    characters: {
        [charId: string]: {
            favor: number;
            unlocked: boolean;
            endings: string[];
            events: string[];
        }
    };

    // 标志位
    flags: {[key: string]: boolean};

    // 玩家数据
    player: {
        playTime: number;          // 累计游玩时间(秒)
        choices: string[];          // 历史选择
    };

    // 附加数据
    extra: {[key: string]: any};
}

interface PlayerData {
    // 持久化数据
    totalPlayTime: number;         // 总游玩时间
    completedEndings: string[];    // 已完成结局
    cgUnlocked: string[];          // 已解锁CG
    musicUnlocked: string[];       // 已解锁音乐
    achievement: string[];          // 已获成就

    // 设置
    settings: GameSettings;
}

interface GameSettings {
    // 音量
    musicVolume: number = 0.8;
    sfxVolume: number = 0.8;
    voiceVolume: number = 1.0;

    // 显示
    textSpeed: number = 50;        // 打字速度
    autoSpeed: number = 3000;      // 自动播放间隔
    backgroundQuality: Quality = Quality.HIGH;

    // 功能
    skipUnread: boolean = false;   // 跳过未读
    autoSave: boolean = true;      // 自动存档
}
```

### 6.2 存储策略

```
数据存储 (微信小游戏):
├── wx.getStorageSync()     # 本地同步存储
├── wx.getStorage()         # 本地异步存储
└── Cloud Storage          # 云存储 (可选)

存储键名:
├── "save_0" ~ "save_5"    # 存档槽位
├── "player_data"          # 玩家数据
├── "settings"             # 游戏设置
└── "game_config"          # 游戏配置缓存
```

---

## 七、音频系统设计

### 7.1 音频资源

```
resources/
├── bgm/
│   ├── title.mp3          # 标题画面
│   ├── chapter_1.mp3      # 第一章
│   ├── chapter_2.mp3      # 第二章
│   ├── date_1.mp3         # 约会场景
│   └── ending.mp3         # 结局
│
├── sfx/
│   ├── dialog_next.mp3    # 对话快进音
│   ├── choice_select.mp3  # 选项选择
│   ├── favor_up.mp3       # 好感提升
│   ├── unlock.mp3         # 解锁音
│   └── button.mp3         # 按钮点击
│
└── voice/
    ├── heroine_1/         # 女主角1语音
    │   ├── ch01_01.mp3
    │   └── ...
    └── heroine_2/         # 女主角2语音
```

### 7.2 音频管理

```typescript
class AudioSystem {
    // 背景音乐
    private bgmChannel: AudioSource;
    private currentBGM: string;

    // 音效池
    private sfxPool: AudioSource[] = [];
    private sfxMax: number = 5;

    // 音量控制
    private musicVolume: number = 0.8;
    private sfxVolume: number = 0.8;

    // 淡入淡出
    private fadeTime: number = 1000;
}
```

---

## 八、微信小游戏适配

### 8.1 平台特性适配

```typescript
// 微信小游戏特有
class PlatformAdapter {
    // 启动参数
    getLaunchOptions(): LaunchOptions;

    // 用户信息 (需授权)
    getUserInfo(): Promise<UserInfo>;

    // 分享
    shareAppMessage(options: ShareOptions): void;

    // 虚拟支付 (需版号)
    requestPayment(params: PaymentParams): void;

    //  banner广告
    createBannerAd(adUnitId: string): BannerAd;

    // 激励视频
    createRewardedVideoAd(adUnitId: string): RewardedVideoAd;

    // 性能监控
    reportPerformance(key: string, value: number): void;
}
```

### 8.2 性能优化策略

```
包体优化:
├── 图片压缩 (TinyPNG)
├── 音频压缩 (FFmpeg -b:a 64k)
├── 代码混淆 (Cocos内置)
└── 资源分包 (Subpackage)

运行时优化:
├── 节点池复用
├── 纹理延迟加载
├── 帧率动态调节
└── 内存管理 (手动释放)
```

---

## 九、开发进度规划

### 第一阶段：核心框架 (第1-2周)
- [ ] 项目初始化配置
- [ ] 场景管理框架
- [ ] 基础UI组件
- [ ] 存档系统基础

### 第二阶段：剧情系统 (第3-4周)
- [ ] 剧情解析器
- [ ] 对话框组件
- [ ] 角色立绘系统
- [ ] 选项分支系统

### 第三阶段：游戏内容 (第5-7周)
- [ ] 角色系统完善
- [ ] 好感度系统
- [ ] 剧情内容制作 (第1-2章)
- [ ] CG/成就系统

### 第四阶段：UI与功能 (第8-9周)
- [ ] 主菜单与设置
- [ ] 存档/读档界面
- [ ] CG画廊
- [ ] 音频系统

### 第五阶段：适配与测试 (第10-11周)
- [ ] 微信平台适配
- [ ] 性能优化
- [ ] Bug修复
- [ ] 审核上架

---

## 十、技术栈总结

| 模块 | 技术方案 |
|------|----------|
| 引擎 | Cocos Creator 3.x |
| 语言 | TypeScript |
| 状态管理 | 自定义EventEmitter |
| 资源加载 | Cocos资源管理 |
| 数据存储 | wx.getStorageSync |
| 音频 | Cocos AudioSource |
| 动画 | Cocos Animation |
| UI框架 | Cocos UI |

---

**文档版本**: v1.0  
**创建日期**: 2026-02-26  
**下次更新**: 角色详细设定、剧情大纲
