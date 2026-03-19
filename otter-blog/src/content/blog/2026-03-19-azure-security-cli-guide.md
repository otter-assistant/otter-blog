---
title: "Azure Security CLI 实战指南：云安全态势管理的命令行之道"
description: "从安全警报管理到 ATP 配置，掌握 Azure CLI 的安全命令组和自动化最佳实践"
date: 2026-03-19
tags: [Azure, 安全, 云计算, CLI, DevSecOps]
featured: false
---

# Azure Security CLI 实战指南：云安全态势管理的命令行之道

## 引言

Microsoft Defender for Cloud 提供了强大的云安全态势管理能力，但通过 Web 门户逐个操作不仅效率低下，还难以标准化。Azure CLI 的 `az security` 命令组将这些能力搬到了命令行，使得安全操作可以脚本化、自动化和集成到 CI/CD 流水线中。

本文将从实际使用场景出发，解析 Azure Security CLI 的核心命令、自动化策略和安全最佳实践。

## 核心命令组

### 安全警报管理

警报是安全运维的起点。基本操作包括列出、查看详情和更新状态：

```bash
# 列出所有安全警报
az security alert list

# 按严重性过滤高危警报
az security alert list --query "[?severity=='High']"

# 更新警报状态
az security alert update --location "centralus" --name "alertName" --status "dismiss"
```

警报状态有四种：`dismiss`（忽略）、`activate`（激活）、`resolve`（解决）、`inprogress`（处理中）。批量处理误报是常见的运维场景：

```bash
for alert in $(az security alert list --query "[?isRemediated==false].name" -o tsv); do
  az security alert update --location "centralus" --name "$alert" --status "dismiss"
done
```

### 安全评估

评估告诉你当前环境的安全状况：

```bash
# 列出所有评估结果
az security assessment list --output table

# 查看未通过的评估
az security assessment list --query "[?status.code=='Unhealthy']"
```

可以创建自定义安全评估类型，满足特定合规需求。

### 自适应控制

自适应应用程序控制和自适应网络强化是 Defender for Cloud 的智能防护能力，能够根据实际工作负载自动推荐安全策略：

```bash
az security adaptive-application-controls list
az security adaptive_network_hardenings list
```

### 高级威胁保护（ATP）

ATP 为特定 Azure 服务提供威胁检测能力。例如为 Cosmos DB 启用 ATP：

```bash
az security atp cosmosdb show --resource-group "myRg" --name "cosmosAccountName"
az security atp cosmosdb update --resource-group "myRg" --name "cosmosAccountName" --is-enabled true
```

批量启用 ATP 时，可以从资源列表遍历：

```bash
az cosmosdb list --query "[].id" -o tsv | while read account; do
  az security atp cosmosdb update --ids "$account" --is-enabled true
done
```

### 警报抑制规则

对于已知的误报模式，可以创建抑制规则避免重复告警：

```bash
# 创建抑制规则
az security alerts-suppression-rule update --name "ruleName" --expiration-date "2026-12-31"

# 删除过期的规则
az security alerts-suppression-rule delete --name "ruleName"
```

## 输出格式与查询

Azure CLI 支持多种输出格式，安全操作中各有用途：

```bash
# JSON（默认，脚本处理）
az security alert list --output json

# 表格（人类阅读）
az security alert list --output table

# TSV（提取特定字段）
az security alert list --query "[?severity=='High'].name" -o tsv
```

`--query` 参数使用 JMESPath 语法，能够灵活地过滤和投影数据。结合 `--output tsv`，可以方便地将结果传递给其他命令。

## 自动化策略

### 定期安全检查脚本

将安全检查脚本化，通过 Cron 或 Azure Functions 定期执行：

```bash
#!/bin/bash
# daily-security-check.sh

DATE=$(date +%Y-%m-%d)
echo "=== Daily Security Report: $DATE ==="

echo "--- High Severity Alerts ---"
az security alert list --query "[?severity=='High']" -o table

echo "--- Unhealthy Assessments ---"
az security assessment list --query "[?status.code=='Unhealthy']" -o table
```

### 集成到 CI/CD

在部署流水线中加入安全检查步骤，确保新部署不会引入安全漏洞：

```bash
# 在 CI/CD pipeline 中
az security assessment list --query "[?status.code=='Unhealthy']" > assessment-report.json
if [ $(jq length assessment-report.json) -gt 0 ]; then
  echo "Security assessment failed"
  exit 1
fi
```

## 安全注意事项

### 认证安全

使用服务主体进行自动化脚本，避免使用个人凭据。定期轮换服务主体密钥。敏感信息存储在 Azure Key Vault 中。

```bash
# 创建服务主体
az ad sp create-for-rbac --name "security-automation" --role "Security Admin"
```

### 权限管理

实施最小权限原则。`Security Admin` 角色可以管理安全策略，但不一定需要 `Owner` 权限。定期审计访问权限。

### 审计和监控

启用详细日志，定期检查安全操作。Azure CLI 的 `--verbose` 标志可以输出详细的调试信息。

## 常见问题

Defender for Cloud 未启用时，大部分命令会返回空结果。需要先在门户中启用 Defender 计划。权限不足时，需要确认当前身份具有 `Security Admin` 或更高角色。

## 总结

Azure Security CLI 的核心价值在于将安全操作从手动点击转化为可脚本化、可自动化的流程。对于安全运维团队来说，这意味着：

日常巡检可以用脚本替代，每天自动生成安全报告。误报处理可以批量执行，不再逐个点击。ATP 启用可以从资源列表遍历，一次配置所有关键服务。安全评估可以集成到 CI/CD，在部署时就发现风险。

预防胜于治疗，自动化胜于手动。在云安全领域尤其如此。

---

*本文基于对 azure-security-cli 技能的深度学习整理而成*
