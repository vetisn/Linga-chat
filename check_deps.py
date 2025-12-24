#!/usr/bin/env python3
"""
依赖检查脚本
检查当前环境中已安装的依赖包
"""

import sys
import importlib
import subprocess

# 核心依赖
CORE_DEPS = [
    ("fastapi", "FastAPI Web框架"),
    ("uvicorn", "ASGI服务器"),
    ("sqlalchemy", "数据库ORM"),
    ("pydantic", "数据验证"),
    ("httpx", "HTTP客户端"),
    ("requests", "HTTP请求库"),
    ("dotenv", "环境变量管理"),
]

def check_package(package_name, description):
    """检查单个包是否已安装"""
    try:
        importlib.import_module(package_name)
        return True, "✅"
    except ImportError:
        return False, "❌"

def get_package_version(package_name):
    """获取包版本"""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "show", package_name],
            capture_output=True,
            text=True,
            check=True
        )
        for line in result.stdout.split('\n'):
            if line.startswith('Version:'):
                return line.split(':', 1)[1].strip()
    except:
        pass
    return "未知"

def main():
    """主检查流程"""
    print("🔍 依赖包检查报告")
    print("=" * 50)
    
    print("\n📦 核心依赖")
    print("-" * 40)
    missing = []
    for package, desc in CORE_DEPS:
        installed, status = check_package(package, desc)
        version = get_package_version(package) if installed else ""
        version_str = f" ({version})" if version and version != "未知" else ""
        print(f"{status} {package:<15} {desc}{version_str}")
        if not installed:
            missing.append(package)
    
    print("\n📊 总结")
    print("-" * 40)
    if missing:
        print(f"❌ 缺少 {len(missing)} 个依赖: {', '.join(missing)}")
        print("💡 请运行: pip install -r requirements.txt")
    else:
        print("✅ 所有依赖已安装，可以启动: python start.py")
    
    return len(missing) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
