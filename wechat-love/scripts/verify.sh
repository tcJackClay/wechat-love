#!/bin/bash
# 游戏代码完整性验证脚本

echo "========================================"
echo "  恋爱养成游戏 - 代码完整性验证"
echo "========================================"
echo ""

PROJECT_DIR="/root/.openclaw/workspace/wechat-love"
ERRORS=0

# 1. 检查目录结构
echo "📁 [1/5] 检查目录结构..."
REQUIRED_DIRS=(
    "assets/scripts/core"
    "assets/scripts/ui"
    "assets/scenes/MainMenu"
    "assets/resources/characters"
    "assets/resources/backgrounds"
    "assets/resources/audio"
    "assets/data/game-config"
    "docs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$PROJECT_DIR/$dir" ]; then
        echo "  ✅ $dir"
    else
        echo "  ❌ 缺失: $dir"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# 2. 检查核心脚本文件
echo "📝 [2/5] 检查核心脚本文件..."
CORE_FILES=(
    "assets/scripts/core/GameStateMachine.ts"
    "assets/scripts/core/DialogSystem.ts"
    "assets/scripts/core/CharacterSystem.ts"
    "assets/scripts/core/SaveLoadSystem.ts"
    "assets/scripts/core/StoryManager.ts"
    "assets/scripts/core/AudioManager.ts"
    "assets/scripts/core/FlagManager.ts"
    "assets/scripts/core/ResourceManager.ts"
    "assets/scripts/core/UIManager.ts"
    "assets/scripts/core/InventorySystem.ts"
    "assets/scripts/core/AchievementSystem.ts"
    "assets/scripts/core/WechatAdapter.ts"
    "assets/scripts/core/SettingsManager.ts"
    "assets/scripts/core/GameManager.ts"
    "assets/scripts/ui/MainMenuManager.ts"
)

for file in "${CORE_FILES[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ 缺失: $file"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# 3. 检查配置文件
echo "⚙️  [3/5] 检查配置文件..."
CONFIG_FILES=(
    "assets/data/game-config/characters.json"
    "assets/data/game-config/story.json"
    "assets/data/game-config/numbers.json"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ 缺失: $file"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# 4. 检查资源文件
echo "🖼️  [4/5] 检查资源文件..."
REQUIRED_RES=(
    "assets/resources/backgrounds/bg_title.jpg"
    "assets/resources/characters/heroine_1/normal.png"
)

for res in "${REQUIRED_RES[@]}"; do
    if [ -f "$PROJECT_DIR/$res" ]; then
        echo "  ✅ $res"
    else
        echo "  ❌ 缺失: $res"
        ERRORS=$((ERRORS + 1))
    fi
done

# 统计资源数量
CHAR_COUNT=$(find "$PROJECT_DIR/assets/resources/characters" -name "*.png" 2>/dev/null | wc -l)
BG_COUNT=$(find "$PROJECT_DIR/assets/resources/backgrounds" -name "*.jpg" -o -name "*.png" 2>/dev/null | wc -l)
echo "  📊 角色立绘: $CHAR_COUNT 个"
echo "  📊 背景图片: $BG_COUNT 个"
echo ""

# 5. 检查Git状态
echo "📦 [5/5] 检查Git状态..."
cd "$PROJECT_DIR"
if git rev-parse --git-dir > /dev/null 2>&1; then
    COMMITS=$(git rev-list --count HEAD)
    echo "  ✅ Git仓库已初始化"
    echo "  📊 总提交数: $COMMITS"
    
    # 检查未提交的更改
    if [ -n "$(git status --porcelain)" ]; then
        echo "  ⚠️  有未提交的更改"
    else
        echo "  ✅ 所有更改已提交"
    fi
else
    echo "  ❌ Git未初始化"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 总结
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo "  ✅ 验证通过！代码完整无误"
else
    echo "  ❌ 发现 $ERRORS 个问题"
fi
echo "========================================"

exit $ERRORS
