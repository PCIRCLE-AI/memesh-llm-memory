<div align="center">

# 🧠 MeMesh Plugin

### Claude Code를 위한 검색 가능한 프로젝트 메모리

결정, 패턴, 컨텍스트를 — 모든 세션에 걸쳐 기억합니다.

[![npm version](https://img.shields.io/npm/v/@pcircle/memesh)](https://www.npmjs.com/package/@pcircle/memesh)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)

[설치](#설치) • [사용법](#사용법) • [문제 해결](#문제-해결) • [English](README.md)

</div>

---

## 왜 이 프로젝트를 만들었나

Claude Code를 정말 좋아합니다. 소프트웨어를 만드는 방식이 완전히 바뀌었습니다.

이 프로젝트는 더 많은 사람들 — 특히 코딩을 처음 접하는 분들 — 이 Claude Code로 vibe coding을 더 잘 활용할 수 있도록 돕고 싶어서 시작했습니다. 프로젝트가 커지면 세션을 넘나드는 모든 결정을 추적하기 어려워진다는 걸 깨달았습니다. 그래서 (당연히 Claude Code와 함께) 여러분을 위해 기억해주는 플러그인을 만들었습니다.

> **참고**: 이 프로젝트는 원래 "Claude Code Buddy"라는 이름이었으며, 상표 문제를 피하기 위해 MeMesh Plugin으로 이름을 변경했습니다.

## 무엇을 할 수 있나요?

MeMesh Plugin은 프로젝트에 **검색 가능한 메모리**를 제공합니다.

Claude Code로 작업하는 동안 MeMesh는 중요한 결정, 아키텍처 컨텍스트, 배운 교훈을 자동으로 저장합니다. 다음 세션을 시작할 때 "auth에 대해 뭘 결정했지?"라고 물으면 즉시 답을 얻을 수 있습니다.

**Claude 내장 메모리와 뭐가 다른가요?**

Claude Code에는 이미 auto memory와 CLAUDE.md가 있습니다 — 일반적인 설정과 지시에 적합합니다. MeMesh는 여기에 전용 **프로젝트 메모리**를 추가합니다. 능동적으로 검색하고 쿼리할 수 있으며, 의미로 검색하는 것도 지원합니다 (정확한 키워드 일치만이 아닙니다).

이렇게 생각하세요:
- **CLAUDE.md** = Claude를 위한 사용 설명서
- **MeMesh** = 프로젝트가 배운 모든 것의 검색 가능한 노트북

---

## 설치

**필요한 것**: [Claude Code](https://docs.anthropic.com/en/docs/claude-code)와 Node.js 20+

```bash
npm install -g @pcircle/memesh
```

Claude Code를 재시작하면 끝.

**작동 확인** — Claude Code에서 입력:

```
buddy-help
```

명령어 목록이 보이면 성공입니다.

<details>
<summary>소스에서 설치 (기여자용)</summary>

```bash
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install && npm run build
```

</details>

---

## 사용법

MeMesh는 Claude Code에 3개의 명령어를 추가합니다:

| 명령어 | 기능 |
|--------|------|
| `buddy-do "작업"` | 메모리 컨텍스트와 함께 작업 실행 |
| `buddy-remember "주제"` | 과거 결정과 컨텍스트 검색 |
| `buddy-help` | 사용 가능한 명령어 표시 |

**예시:**

```bash
buddy-do "이 코드베이스 설명해줘"
buddy-do "사용자 인증 추가해줘"
buddy-remember "API 설계 결정사항"
buddy-remember "왜 PostgreSQL을 선택했는지"
```

모든 데이터는 로컬 머신에 저장됩니다. 결정사항은 90일, 세션 노트는 30일간 보관됩니다.

---

## 지원 환경

| 플랫폼 | 상태 |
|--------|------|
| **macOS** | ✅ 지원 |
| **Linux** | ✅ 지원 |
| **Windows** | ✅ 지원 (WSL2 권장) |

**함께 사용 가능:**
- Claude Code CLI (터미널)
- Claude Code VS Code 확장
- Cursor (MCP 경유)
- 기타 MCP 호환 에디터

**Claude Desktop (Cowork)**: 기본 명령어는 작동하지만, 메모리 기능은 CLI 버전이 필요합니다. [Cowork 상세](docs/COWORK_SUPPORT.md)를 참고하세요.

---

## 문제 해결

**MeMesh가 나타나지 않나요?**

```bash
# 설치 확인
npm list -g @pcircle/memesh

# Node.js 버전 확인 (20+ 필요)
node --version

# 설정 다시 실행
memesh setup
```

그런 다음 Claude Code를 완전히 재시작하세요.

추가 도움: [문제 해결 가이드](docs/TROUBLESHOOTING.md)

---

## 더 알아보기

- **[시작하기](docs/GETTING_STARTED.md)** — 단계별 설정
- **[사용자 가이드](docs/USER_GUIDE.md)** — 예제 포함 전체 가이드
- **[명령어](docs/COMMANDS.md)** — 모든 사용 가능한 명령어
- **[아키텍처](docs/ARCHITECTURE.md)** — 내부 작동 원리
- **[기여하기](CONTRIBUTING.md)** — 도와주고 싶다면? 여기서 시작
- **[개발 가이드](docs/DEVELOPMENT.md)** — 기여자용

---

## 라이선스

MIT — [LICENSE](LICENSE) 참조

---

<div align="center">

문제가 있나요? [이슈 열기](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new) — 빠르게 응답합니다.

[버그 리포트](https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new?labels=bug&template=bug_report.yml) • [기능 요청](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

</div>
