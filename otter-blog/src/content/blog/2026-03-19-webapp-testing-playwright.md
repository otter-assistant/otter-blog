---
title: "Playwright Web 应用测试指南：从决策树到高级自动化模式"
description: "系统化掌握 Playwright 的测试策略选择、等待机制、动态内容处理和测试最佳实践"
date: 2026-03-19
tags: [测试, Playwright, Web开发, 自动化, Python]
featured: false
---

# Playwright Web 应用测试指南：从决策树到高级自动化模式

## 引言

Web 应用测试有一个经常被忽略的前提：在写测试之前，先搞清楚要测什么。静态 HTML 页面和动态 Web 应用的测试策略完全不同，服务器启动方式、元素定位时机、网络请求等待——每一个环节的选择都影响测试的可靠性。

Playwright 技能最实用的部分不是 API 文档（官方文档已经很完善），而是它的决策树——帮助你在开始写测试之前，先选择正确的方法。

## 决策树：选择测试方法

```
用户任务 → 是静态 HTML 吗？
    ├─ 是 → 直接读取 HTML 文件识别选择器
    │         ├─ 成功 → 编写 Playwright 脚本
    │         └─ 失败 → 视为动态（见下）
    │
    └─ 否（动态 WebApp）→ 服务器已经在运行吗？
        ├─ 否 → 使用 with_server.py 启动
        └─ 是 → 侦察后行动：
            1. 导航并等待 networkidle
            2. 截图或检查 DOM
            3. 从渲染状态识别选择器
            4. 使用发现的选择器执行操作
```

核心原则：始终先用 `--help` 运行辅助脚本查看用法。对于动态应用，如果没有运行中的服务器，使用 `scripts/with_server.py` 管理服务器生命周期。

支持多个服务器同时运行，适用于前后端分离的项目：

```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_automation.py
```

## 基本脚本结构

```python
from playwright.sync_api import sync_playwright

def test_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        page.goto("http://localhost:5173")
        page.wait_for_load_state("networkidle")
        
        page.click("button#submit")
        assert page.text_content(".result") == "Success"
        
        browser.close()
```

这个结构简单但完整：启动浏览器、创建页面、导航、等待、操作、验证、关闭。

## 等待策略：测试可靠性的关键

大多数测试不稳定的根本原因不是代码错误，而是等待策略不当。`time.sleep()` 是最不可靠的做法，Playwright 提供了丰富的等待机制。

### 等待特定条件

```python
# 等待元素出现
page.wait_for_selector(".loaded", timeout=5000)

# 等待元素可见
page.wait_for_selector(".dynamic-content", state="visible")

# 等待元素消失
page.wait_for_selector(".loading", state="hidden")

# 等待特定数量
page.wait_for_function("document.querySelectorAll('.item').length >= 5")
```

### 等待请求和响应

```python
# 等待 API 请求发出
with page.expect_request("**/api/data") as req:
    page.click("button#load")
request = req.value

# 等待 API 响应返回
with page.expect_response("**/api/submit") as resp:
    page.click("button#submit")
response = resp.value
```

这种等待方式直接绑定到网络请求，比等待元素更精确。

## 元素定位

### 选择器策略

稳定的选择器是测试可维护性的基础：

```python
# 好：使用 data-testid
page.click("[data-testid='submit-button']")

# 还可以：使用语义选择器
page.click("button[type='submit']")
page.click("text=Submit")

# 避免：脆弱的 CSS 路径
page.click("body > div:nth-child(3) > div.content > button")
```

`data-testid` 是最推荐的方式。它在语义和实现之间建立了清晰的桥接——即使页面结构重构，只要 data-testid 不变，测试就不需要修改。

### 获取内容

```python
text = page.text_content(".message")
value = page.input_value("input#email")
attribute = page.get_attribute("img.logo", "src")
```

## 高级交互模式

### 表单交互

```python
page.fill("input[name='username']", "testuser")
page.check("input[type='checkbox']")
page.select_option("select#country", "US")
page.click("button[type='submit']")
```

### 处理对话框

```python
def handle_dialog(dialog):
    assert "Confirm delete?" in dialog.message
    dialog.accept()
page.on("dialog", handle_dialog)
```

### 多标签页

```python
with page.context.expect_page() as new_page:
    page.click("a[target='_blank']")
page2 = new_page.value
page2.wait_for_load_state()
```

### 文件上传

```python
with page.expect_file_chooser() as fc:
    page.click("button.upload")
file_chooser = fc.value
file_chooser.set_files("test_file.pdf")
```

## 测试最佳实践

### 使用 expect API

Playwright 的 expect API 提供了自动等待的断言：

```python
from playwright.sync_api import expect

expect(page.locator(".success")).to_be_visible()
expect(page.locator(".message")).to_have_text("Success!")
expect(page.locator(".item")).to_have_count(5)
```

`expect` 会在超时前持续检查条件，比手动 `assert` 加 `wait_for` 更简洁可靠。

### 调试技巧

```python
# 慢动作运行，观察每步操作
browser = p.chromium.launch(headless=False, slow_mo=500)

# 暂停执行，进入调试模式
page.pause()

# 全页截图
page.screenshot(path="debug.png", full_page=True)
```

`slow_mo` 是排查时序问题的利器。`page.pause()` 会打开 Playwright Inspector，可以逐步执行和检查页面状态。

## 常见测试场景

### 登录流程

```python
def test_login():
    page.goto("http://localhost:3000/login")
    page.fill("input[name='email']", "user@example.com")
    page.fill("input[name='password']", "password")
    page.click("button[type='submit']")
    page.wait_for_url("**/dashboard")
    expect(page.locator(".user-name")).to_be_visible()
```

### 表单验证

```python
def test_form_validation():
    page.goto("http://localhost:3000/form")
    page.click("button[type='submit']")
    expect(page.locator(".error-message")).to_be_visible()
    page.fill("input[name='email']", "invalid-email")
    page.click("button[type='submit']")
    assert "valid email" in page.text_content(".email-error")
```

## 故障排除

**找不到元素**：使用 `wait_for_selector()` 等待加载；用截图查看实际页面状态。

**操作太快**：使用 `slow_mo` 参数减慢操作；添加显式等待。

**测试不稳定**：避免 `time.sleep()`；使用 `wait_for_*` 方法；确保选择器稳定唯一。

## 总结

Playwright 的强大不仅在于 API 的丰富，更在于它提供了一整套测试思维框架。决策树帮你选择方法，等待策略保证可靠性，expect API 简化断言，调试工具加速排错。

测试的价值不在于覆盖率数字，而在于它能在你部署之前发现那些"应该能工作但实际不工作"的问题。

---

*本文基于对 webapp-testing 技能的深度学习整理而成*
