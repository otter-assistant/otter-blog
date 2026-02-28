#!/usr/bin/env python3
"""
QA 验证脚本：调试面板连线展示功能
测试 3/4/6 三种多边形边数的网格连线是否规则
"""

import os
from playwright.sync_api import sync_playwright

# 截图保存目录
SCREENSHOT_DIR = "/Users/luanmeihua/Codes/obsidian2astro-template/qa-screenshots"
BASE_URL = "http://localhost:4323"  # dev server 端口

# 确保 screenshot 目录存在
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def main():
    console_logs = []
    page_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # 捕获 console 日志
        def handle_console(msg):
            console_logs.append(f"[{msg.type}] {msg.text}")
        
        page.on("console", handle_console)
        
        # 捕获页面错误
        def handle_pageerror(err):
            page_errors.append(f"PageError: {err}")
        
        page.on("pageerror", handle_pageerror)
        
        print("1. 导航到首页...")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        
        # 检查调试面板是否存在
        debug_panel = page.locator("#bg-debug-panel")
        if debug_panel.count() == 0:
            print("❌ 错误：未找到调试面板 (#bg-debug-panel)")
            print("   可能原因：非 DEV 环境")
            browser.close()
            return
        
        print("✓ 调试面板已找到")
        
        # 定义元素选择器
        show_lines_cb = page.locator("#show-lines")
        sides_3_cb = page.locator("#sides-3")
        sides_4_cb = page.locator("#sides-4")
        sides_6_cb = page.locator("#sides-6")
        regenerate_btn = page.locator("#regenerate-btn")
        
        # 验证所有控件存在
        for name, locator in [
            ("show-lines", show_lines_cb),
            ("sides-3", sides_3_cb),
            ("sides-4", sides_4_cb),
            ("sides-6", sides_6_cb),
            ("regenerate-btn", regenerate_btn)
        ]:
            if locator.count() == 0:
                print(f"❌ 错误：未找到控件 #{name}")
                browser.close()
                return
        print("✓ 所有调试控件已找到")
        
        # 清除所有 sides 勾选的辅助函数
        def clear_all_sides():
            if sides_3_cb.is_checked():
                sides_3_cb.click()
            if sides_4_cb.is_checked():
                sides_4_cb.click()
            if sides_6_cb.is_checked():
                sides_6_cb.click()
        
        # 测试三种网格配置
        test_cases = [
            {"sides": 3, "name": "正三角网格", "cb": sides_3_cb},
            {"sides": 4, "name": "正方网格", "cb": sides_4_cb},
            {"sides": 6, "name": "蜂窝/正六边形网格", "cb": sides_6_cb},
        ]
        
        for case in test_cases:
            print(f"\n--- 测试 {case['name']} (sides={case['sides']}) ---")
            
            # 1. 清除所有 sides 勾选
            clear_all_sides()
            
            # 2. 勾选当前 sides
            case["cb"].click()
            print(f"  ✓ 已勾选 sides-{case['sides']}")
            
            # 3. 勾选显示连线（如果未勾选）
            if not show_lines_cb.is_checked():
                show_lines_cb.click()
                print("  ✓ 已勾选显示连线")
            
            # 4. 点击重新生成
            regenerate_btn.click()
            print("  ✓ 已点击重新生成")
            
            # 5. 等待渲染
            page.wait_for_timeout(500)
            
            # 6. 截图
            screenshot_path = f"{SCREENSHOT_DIR}/lines-sides-{case['sides']}.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"  📷 截图已保存: {screenshot_path}")
        
        # 测试 showLines 开关
        print("\n--- 测试 showLines 开关 ---")
        
        # 关闭 showLines
        if show_lines_cb.is_checked():
            show_lines_cb.click()
            print("  ✓ 已取消勾选显示连线")
        
        regenerate_btn.click()
        page.wait_for_timeout(500)
        screenshot_path = f"{SCREENSHOT_DIR}/lines-off.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"  📷 连线关闭截图: {screenshot_path}")
        
        # 重新打开 showLines
        show_lines_cb.click()
        regenerate_btn.click()
        page.wait_for_timeout(500)
        screenshot_path = f"{SCREENSHOT_DIR}/lines-on.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"  📷 连线开启截图: {screenshot_path}")
        
        # 输出 console 日志摘要
        print("\n=== Console 日志摘要 ===")
        if console_logs:
            # 过滤出错误和警告
            errors = [log for log in console_logs if "[error]" in log.lower()]
            warnings = [log for log in console_logs if "[warning]" in log.lower()]
            
            if errors:
                print(f"❌ 错误 ({len(errors)} 个):")
                for e in errors:
                    print(f"   {e}")
            else:
                print("✓ 无 console 错误")
            
            if warnings:
                print(f"⚠️ 警告 ({len(warnings)} 个):")
                for w in warnings[:5]:  # 只显示前5个
                    print(f"   {w}")
        else:
            print("✓ 无 console 日志")
        
        # 输出页面错误
        if page_errors:
            print(f"\n❌ 页面错误 ({len(page_errors)} 个):")
            for err in page_errors:
                print(f"   {err}")
        else:
            print("\n✓ 无页面错误")
        
        browser.close()
        print("\n=== 验证完成 ===")
        print(f"截图保存在: {SCREENSHOT_DIR}/")

if __name__ == "__main__":
    main()
