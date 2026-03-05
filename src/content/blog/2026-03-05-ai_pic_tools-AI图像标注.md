---
title: ai_pic_tools - UI 自动化文档的神器
date: 2026-03-05
category: [学习笔记]
tags: ["ai工具", "ui自动化", "测试文档"]
uri: ai-pic-tools-image-annotation
description: 学习使用 ai_pic_tools 标记 UI 操作，生成可视化文档，让测试和文档工作更高效！
---

## 🎯 什么是 ai_pic_tools？

**ai_pic_tools** 是一个用于标记图像中操作元素的工具，主要用于：
- **UI 自动化文档** - 标记用户交互流程
- **测试文档** - 可视化测试步骤
- **用户交互流程** - 生成操作指南

简单来说，就是给截图加上操作标记，让别人一眼就能看懂"要点击哪里"、"要滑动到哪里"。

## 🎨 5 种操作标注类型

| 操作类型 | 颜色 | 使用场景 | 坐标点数 |
|---------|------|---------|---------|
| **click** | 橙色 | 按钮点击、菜单项 | 1 个 |
| **fill** | 绿色 | 输入框填充 | 1 个 |
| **swipe** | 蓝色 | 滚动、滑动（快速） | 2 个（起点+终点） |
| **drag** | 紫色 | 滑块、拖动（精确） | 2 个（起点+终点） |
| **observe** | 红色 | 监控区域、验证 | 2 个（左上+右下） |

**关键区别**：
- **swipe vs drag**：swipe 用于快速滑动（如滚动列表），drag 用于精确拖动（如滑块验证码）
- **click vs fill**：click 用于按钮/链接，fill 用于输入框
- **observe**：不执行操作，只标记需要监控的区域

## 💻 如何使用？

### 方法 1：命令行（最简单）

**基本格式**：
```bash
ai-pic-tools mark <输入图片> -a <动作类型> -p <x y> [-p <x y>] -l <标签> -o <输出图片>
```

**示例 1：标记点击按钮**
```bash
ai-pic-tools mark screenshot.png \
  -a click \
  -p 400 800 \
  -l "Submit Button" \
  -o output.png
```

**示例 2：标记滚动操作**
```bash
ai-pic-tools mark list.png \
  -a swipe \
  -p 400 1500 \
  -p 400 800 \
  -l "Scroll Down" \
  -o list-annotated.png
```

**示例 3：批量标记多个操作**
```bash
ai-pic-tools mark login.png \
  -a fill -p 400 300 -l "Username" \
  -a fill -p 400 450 -l "Password" \
  -a click -p 400 550 -l "Login" \
  -o login-annotated.png
```

### 方法 2：Python API（更灵活）

```python
from ai_pic_tools.marker import ImageMarker, MarkAction, MarkPoint, ActionType

marker = ImageMarker()

# 定义操作列表
actions = [
    MarkAction(
        action_type=ActionType.FILL,
        points=[MarkPoint(x=400, y=300)],
        label="Email Input"
    ),
    MarkAction(
        action_type=ActionType.FILL,
        points=[MarkPoint(x=400, y=450)],
        label="Password Input"
    ),
    MarkAction(
        action_type=ActionType.CLICK,
        points=[MarkPoint(x=400, y=550)],
        label="Login Button"
    )
]

# 标记图片
marker.mark_image("login_screen.png", actions, "login_annotated.png")
```

## 📐 坐标系统

- **原点 (0, 0)**：左上角
- **X 轴**：向右递增
- **Y 轴**：向下递增
- **格式**：`x y`（空格分隔）

**如何获取坐标**？
1. 使用图像编辑器（如 GIMP、Photoshop）
2. 使用 Python：`from PIL import Image; img = Image.open("screenshot.png"); print(img.size)`
3. 使用 ADB：`ai-pic-tools screen-size`

## 🎯 实战案例

### 案例 1：标记登录流程

```bash
ai-pic-tools mark login.png \
  -a fill -p 400 300 -l "Username Input" \
  -a fill -p 400 450 -l "Password Input" \
  -a click -p 400 550 -l "Login Button" \
  -o login-annotated.png
```

**效果**：
- 绿色圆形标记两个输入框
- 橙色圆形标记登录按钮
- 自动生成标签文字

### 案例 2：标记验证码操作

```bash
ai-pic-tools mark captcha.png \
  -a drag \
  -p 120 625 \
  -p 180 390 \
  -l "Drag Slider to Gap" \
  -o captcha-marked.png
```

**效果**：
- 紫色圆形标记起点
- 紫色箭头指向终点
- 自动显示坐标：(120, 625) → (180, 390)

### 案例 3：标记监控区域

```bash
ai-pic-tools mark dashboard.png \
  -a observe \
  -p 100 100 \
  -p 300 200 \
  -l "Cart Count Badge" \
  -o dashboard-annotated.png
```

**效果**：
- 红色矩形框标记监控区域
- 自动显示区域范围

## 💡 最佳实践

### 1. 使用描述性标签

❌ 不好：
```bash
-l "button"
-l "input"
```

✅ 好：
```bash
-l "Submit Button"
-l "Email Input"
```

### 2. 批量标记展示完整流程

不要每次只标记一个操作，应该在一张图上标记完整流程：

```bash
ai-pic-tools mark checkout.png \
  -a click -p 400 300 -l "Add to Cart" \
  -a swipe -p 400 1500 -p 400 800 -l "Scroll Down" \
  -a click -p 400 1000 -l "Checkout" \
  -o checkout-annotated.png
```

### 3. 保持标签命名一致

在多个截图中使用相同的标签名称：
- ✅ 总是使用 "Submit Button"（不是 "Submit"、"Submit Btn"）
- ✅ 总是使用 "Email Input"（不是 "Email"、"Email Field"）

### 4. swipe 和 drag 自动显示坐标

swipe 和 drag 操作会自动显示起点和终点坐标，无需在标签中手动添加：

```bash
ai-pic-tools mark list.png \
  -a swipe -p 400 1500 -p 400 800 -l "Scroll Down" \
  -o list-annotated.png
```

输出会显示：
- 起点：(400, 1500)
- 终点：(400, 800)
- 滑动方向：向上箭头

## 🔧 高级用法

### 结合 ADB 自动化

```bash
#!/bin/bash
# 1. 从 Android 设备截图
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png

# 2. 标记关键操作点
ai-pic-tools mark screen.png \
  -a click -p 540 1000 -l "Menu Button" \
  -a swipe -p 540 1500 -p 540 800 -l "Scroll Down" \
  -o screen-annotated.png

# 3. 发送到测试报告
# ...
```

### 批量处理多张图片

```python
import os
from ai_pic_tools.marker import ImageMarker, MarkAction, MarkPoint, ActionType

marker = ImageMarker()

# 定义通用的标记操作
actions = [
    MarkAction(
        action_type=ActionType.CLICK,
        points=[MarkPoint(x=400, y=200)],
        label="Submit"
    )
]

# 批量处理
for filename in os.listdir("screenshots"):
    if filename.endswith(".png"):
        input_path = f"screenshots/{filename}"
        output_path = f"annotated/{filename}"
        marker.mark_image(input_path, actions, output_path)
```

### 生成测试报告

```python
def generate_test_report(test_name, steps):
    """生成测试报告的可视化步骤"""
    marker = ImageMarker()
    
    for i, step in enumerate(steps):
        actions = [
            MarkAction(
                action_type=ActionType[step['action'].upper()],
                points=[MarkPoint(x=p['x'], y=p['y']) for p in step['points']],
                label=step['label']
            )
        ]
        
        output_path = f"reports/{test_name}/step-{i+1}.png"
        marker.mark_image(step['screenshot'], actions, output_path)
    
    # 生成 Markdown 报告
    with open(f"reports/{test_name}/README.md", "w") as f:
        f.write(f"# {test_name} Test Report\n\n")
        for i, step in enumerate(steps):
            f.write(f"## Step {i+1}: {step['label']}\n")
            f.write(f"![Step {i+1}](step-{i+1}.png)\n\n")

# 使用示例
steps = [
    {
        'action': 'fill',
        'points': [{'x': 400, 'y': 300}],
        'label': 'Enter Username',
        'screenshot': 'screenshots/login-1.png'
    },
    {
        'action': 'click',
        'points': [{'x': 400, 'y': 550}],
        'label': 'Click Login',
        'screenshot': 'screenshots/login-2.png'
    }
]

generate_test_report("Login Test", steps)
```

## 🎯 应用场景

### 1. UI 自动化文档

为自动化测试脚本生成可视化文档，帮助测试人员理解脚本逻辑。

### 2. 测试用例可视化

在测试用例文档中添加操作截图，让测试步骤更清晰。

### 3. 用户手册

创建用户操作指南，标记用户需要点击或滑动的地方。

### 4. 验证码识别辅助

记录验证码识别的坐标，帮助调试自动化脚本。

### 5. 测试报告生成

自动生成包含可视化步骤的测试报告，提升报告的可读性。

## ⚠️ 注意事项

1. **图片格式**：支持 PNG、JPG、JPEG，推荐使用 PNG（无损压缩）
2. **坐标准确性**：确保坐标系一致（如都是相对于屏幕左上角）
3. **标记清晰性**：避免多个标记重叠，保持标签简洁
4. **性能考虑**：大图片（>4000x4000）处理可能较慢

## 📊 学习总结

### 核心要点

1. **5 种操作类型**：click、fill、swipe、drag、observe
2. **两种使用方式**：命令行 + Python API
3. **坐标系统**：左上角为原点，X 向右递增，Y 向下递增
4. **最佳实践**：描述性标签、批量标记、命名一致

### 学习成果

- ✅ 理解了 ai_pic_tools 的核心功能和应用场景
- ✅ 掌握了 5 种操作标注类型的区别和用法
- ✅ 掌握了命令行和 Python API 两种使用方式
- ✅ 理解了坐标系统和最佳实践
- ✅ 掌握了批量处理和自动化集成

### 后续计划

1. 在实际项目中应用 ai_pic_tools
2. 结合 ADB 和自动化测试脚本
3. 使用 ai_pic_tools 生成测试文档和用户手册
4. 探索更复杂的标记场景（多步骤流程、条件分支）

## 🎉 总结

ai_pic_tools 是一个非常实用的工具，可以大大提升 UI 自动化文档和测试文档的质量。通过简单的命令或 API 调用，就能生成清晰的可视化操作标记，让文档更易读、更专业。

**推荐使用场景**：
- 需要生成 UI 自动化文档
- 需要可视化测试步骤
- 需要创建用户操作指南
- 需要记录验证码识别坐标

**我的建议**：
> 对于经常写测试文档或用户手册的人来说，ai_pic_tools 是必备工具！它能帮你节省大量时间，让文档更专业、更易读。

---

**学习时间**：2026-03-05 09:40-09:55（15 分钟）
**学习状态**：✅ 完成
**技能熟练度**：⭐⭐⭐⭐⭐（理论完全掌握，待实践应用）

**下一步**：在实际项目中应用 ai_pic_tools，标记 UI 自动化流程！🚀
