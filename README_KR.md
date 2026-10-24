# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

> **언어 안내**: 이 README는 한국어 버전입니다. 위 링크에서 다른 언어 버전을 선택할 수 있습니다. Steering 파일(도메인 지식)은 중국어 번체로 작성되어 있으며 영어 요약이 각 파일 상단에 포함되어 있습니다. Steering 파일을 직접 읽을 필요 없이, 원하는 언어(한국어, 영어, 일본어, 중국어)로 도구와 상호작용하면 자동으로 해당 언어로 응답합니다. 언어 관련 문제가 있으면 이슈를 열어주세요.

Kiro를 Unity 개발 AI 어시스턴트로 전환하세요. MCP(Model Context Protocol — AI 어시스턴트가 개발 도구와 상호작용하기 위한 표준화된 프로토콜로, 메뉴를 직접 탐색하거나 반복적인 기본 코드(boilerplate)를 작성하는 대신 자연어로 원하는 작업을 설명할 수 있게 해줍니다)를 통해 자연어로 Unity Editor를 제어하며, 에셋 관리, 씬 구축, 빌드 자동화, 성능 분석, 코드 품질 검사 등을 지원합니다 — 40개 이상의 TypeScript 도구 모듈과 15개의 도메인 지식 파일을 내장하고 있습니다.

> **Unity 6.4 기준 버전**: 이 Power는 **Unity 6.4**(릴리스 스트림 `6000.4`, 최신 패치 `6000.4.12f1`, 2026-06-17 릴리스)와 **MCP for Unity v10.3.0 이상(최소 v10.0.0)** 의 도구 집합을 대상으로 합니다. 이 Power가 지원하는 최소 Editor 버전은 **Unity 6.0(`6000.0`)** 이며, 브리지 자체의 하한선은 더 낮습니다(Unity 2021.3 LTS). 모든 가이드는 **Unity `6000.4.6f1` + URP 17.4.0, Windows Editor, 2026-10-21** 환경에서 실제로 확인했습니다. 먼저 MCP for Unity **9.6.8**에서 확인하고, 이후 같은 머신에서 브리지를 **10.3.0**으로 업그레이드한 뒤 직접 호출로 다시 확인했습니다([브리지 업그레이드: 반드시 함께 맞춰야 하는 두 개의 버전 고정](#브리지-업그레이드-반드시-함께-맞춰야-하는-두-개의-버전-고정) 참조) — Unity 6.5, 6.6 및 이후 6.x에서도 동작할 것으로 예상되지만 여기서 검증하지는 **않았습니다**. **10.3.0에서 직접 호출로 실측 확인한 항목**: 실행 중인 브리지 버전, 전체 **49개** 도구 목록과 9.6.8 → 10.3.0 차이가 순수한 추가뿐이라는 사실(6개 추가, **제거나 이름 변경은 전혀 없음** — 따라서 이 Power에는 마이그레이션 비용이 없습니다), 새 `asset_gen` 도구 그룹이 **기본적으로 꺼져 있다**는 점과 그 그룹의 도구는 개발자가 직접 준비한 외부 서비스 크레딧을 소비한다는 점, 10개 도구 그룹의 구성원과 기본값, 그리고 이 문서가 기술하는 `manage_asset` / `find_gameobjects` / `manage_scene` 계약. 여섯 번째 라운드에서는 **쓰기 경로**를 실제로 실행해 검증했습니다: GameObject · component · prefab · script · 애셋 폴더 쓰기 액션, `refresh_unity`, 그리고 `run_tests` → `get_test_job` 비동기 job 라이프사이클 전체입니다. 모든 쓰기는 격리된 `Assets/_MCPVerify/` 폴더 안으로 한정했고 작업 후 전부 삭제했으며, 프로젝트가 원래 기준 상태로 돌아왔음을 확인했습니다("쓰기 경로에서 확인된 것" 절 참조). **여전히 미검증**인 항목: `asset_gen`의 여섯 개 도구(**실제로 비용이 발생하므로 의도적으로 한 번도 호출하지 않았습니다**), `manage_build`(검증 머신 자체의 권한 규칙에 막힘), 그리고 **실제 테스트를 대상으로 한** `run_tests` — 검증 프로젝트에는 test assembly가 하나도 없어서 job 라이프사이클은 확인되었지만 **통과/실패 결과 보고는 검증되지 않았습니다**. Unity 6.4는 Update 릴리스이며 패치 스트림이 2026-06-17에 종료되었으므로, 버전을 고정해 프로덕션에 들어가는 프로젝트는 **Unity 6.3 LTS**(2027년 12월까지 지원) 또는 현재의 Update 릴리스로 이동해야 합니다. **Unity 6.0 LTS는 2026-10-16에 지원이 종료되었습니다 — "안전한 구버전"으로도 권장하지 않습니다.** 출처: [unity.com/releases](https://unity.com/releases/), [endoflife.date/unity](https://endoflife.date/unity) (모두 2026-10-21 조회).
>
> **6.4 전용 가이드가 다루는 내용**: URP는 **Render Graph 단일 경로**가 되었습니다 — URP Compatibility Mode와 `URP_COMPATIBILITY_MODE` 스크립팅 정의는 6.4에서 완전히 제거되어, 더 이상 레거시 커스텀 render pass의 우회로가 아닙니다. GPU Resident Drawer(Forward+/Deferred+ GPU 인스턴싱, 2D Renderer에서는 사용 불가)와 개편된 Rendering Statistics 창 — 이 창은 드로우 콜을 하나의 숫자로 보고하는 대신 어떤 배칭 경로가 흡수했는지 항목별로 나눠 보여줍니다. `InstanceID`는 `EntityId`로 대체되었으므로 브리지가 반환한 instance id는 불투명한 토큰으로 취급하세요 — 그대로 브리지에 되돌려 주기만 하고, 산술 연산·정렬·파싱은 하지 마세요. iOS에서 PVRTC가 제거되었습니다(ASTC 또는 ETC만 사용). Web 빌드는 `[BurstCompile]` 잡을 백그라운드 워커에서 실행하지만 멀티스레드 *렌더링*은 여전히 지원되지 않습니다. 6.4부터 URP 2D 프레임 루프에 커스텀 render pass를 주입할 수 있습니다. OculusXR 패키지는 권장되지 않으며 OpenXR 플러그인으로 이전해야 하고, HoloLens 2 지원과 해당 플러그인은 6.4에서 deprecated 되었습니다(OculusXR이 실제로 제거되는 버전은 미검증). 스크립팅 백엔드: `manage_build`는 **`mono` 또는 `il2cpp`만** 허용하므로 이 Power로는 CoreCLR을 선택할 수 없습니다. 출처: [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64), [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64) (모두 2026-10-21 조회).
>
> 이 Power는 기억된 버전 번호만으로 동작을 단정하지 않고, MCP를 통해 연결된 프로젝트를 확인합니다 — 활성 렌더 파이프라인은 `manage_graphics(action: "pipeline_get_info")`, Unity 버전과 플랫폼은 `mcpforunity://project/info` 리소스, 설치된 패키지는 `manage_packages(action: "list_packages")` 로 조회한 뒤 버전별 권장 사항을 적용합니다.

> **용어 안내**: 이 문서에서 사용되는 주요 기술 용어입니다.
> - **MCP** (Model Context Protocol, 모델 컨텍스트 프로토콜): AI 어시스턴트가 개발 도구와 통신하기 위한 표준 프로토콜입니다. AI가 Unity Editor와 같은 외부 도구에 명령을 보내고 결과를 받을 수 있게 해주는 통신 규격으로, 개발자가 메뉴를 직접 탐색하는 대신 자연어로 작업을 지시할 수 있게 합니다.
> - **DAG** (Directed Acyclic Graph, 방향 비순환 그래프): 순환(루프)이 없는 방향 그래프 자료구조로, 작업 의존성 순서를 결정하는 데 사용됩니다. 예를 들어 "텍스처 임포트를 먼저 완료해야 머티리얼 생성을 시작할 수 있다"는 관계를 표현합니다.
> - **MVC** (Model-View-Controller, 모델-뷰-컨트롤러): 코드를 데이터(Model — 게임 상태, 플레이어 정보), 표시(View — UI, 렌더링), 로직(Controller — 입력 처리, 게임 규칙) 세 부분으로 분리하는 아키텍처 패턴입니다. 이 분리를 통해 코드의 유지보수와 테스트가 용이해집니다.
> - **ECS** (Entity-Component-System, 엔티티-컴포넌트-시스템): Unity DOTS(Data-Oriented Technology Stack, 데이터 지향 기술 스택) 기반의 아키텍처 패턴입니다. 전통적인 객체 지향 방식 대신 데이터 배치를 최적화하여 대량의 오브젝트(수천~수만 개)를 효율적으로 처리하도록 설계되었습니다. 쉽게 말해, 수천 개의 적이나 파티클을 한꺼번에 관리하는 효율적인 코드 구조 방식입니다.
> - **ScriptableObject** (스크립터블 오브젝트): Unity의 직렬화 가능한 데이터 컨테이너입니다. MonoBehaviour와 달리 씬에 부착할 필요 없이 독립적으로 존재하며, 게임 설정, 레벨 데이터, 아이템 정보 등 여러 오브젝트가 공유하는 데이터를 저장하는 데 사용됩니다.
> - **AssetBundle** (에셋 번들): Unity 에셋(모델, 텍스처, 사운드 등)을 묶어 배포하기 위한 패키징 형식입니다. 초기 앱 크기를 줄이고 콘텐츠를 필요할 때 동적으로 다운로드할 수 있게 해줍니다. Addressables 시스템의 기반 기술이기도 합니다.

![Kiro Unity Accelerator 스크린샷](image/README.png)

## 기능

- **에셋 자동화** — 에셋 프리셋 일괄 적용, 에셋 타입 자동 감지, 변경 요약 생성
- **씬 스캐폴딩** — 원커맨드 씬 구조 생성, 충돌 감지 내장
- **빌드 자동화** — `manage_build`를 통한 로컬 빌드, 빌드 로그 파싱, 재사용 가능한 빌드 설정 템플릿
- **크로스 플랫폼 테스트** — `run_tests` / `get_test_job`을 통한 테스트 실행, 결과 포맷팅, 테스트 스위트 변환
- **워크플로우 자동화** — DAG 의존성 검증 및 토폴로지 실행을 통한 멀티스텝 워크플로우
- **성능 분석** — Profiler 스크린샷 분석, 코드 안티패턴 스캔, 최적화 권장사항
- **코드 품질** — MVC/ECS/ScriptableObject 아키텍처 검사, 순환 의존성 감지
- **지식 관리** — 팀 문서 관리, API 변경 추적, 만료 감지
- **플랫폼 호환성** — Shader 호환성, 메모리 예산 검사, 심각도 분류(XR/VR 포함)
- **에셋 의존성 관리** — 의존성 트리, 고아 에셋 감지, AssetBundle 중복 검사
- **레벨 디자인 도구** — Editor 확장 스크립트 생성, ScriptableObject 템플릿, 씬 오브젝트 일괄 설정
- **UI 의존성 분석** — 크로스 파일 UI 참조 추적, 이벤트 체인 분석, 결합도 평가

## 아키텍처

```
Developer (Natural Language)
    → Kiro (AI Brain)
        → MCP Protocol
            → Unity Editor (Execution Layer)

Kiro Unity Accelerator (Intelligence Layer)
├── POWER.md        → Main doc defining tools & workflows
├── steering/       → 15 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## 어느 "Unity MCP"인가 — 서로 다른 세 프로젝트

"Unity MCP"라는 이름의 변형을 쓰는, 서로 무관한 세 프로젝트가 있습니다. 이 Power는 **첫 번째만** 대상으로 합니다. 섞어 쓰면 이 문서의 어디에도 맞지 않는 도구 이름과 포트가 나옵니다. 아래 세 행은 모두 **2026-10-21** 조회 기준입니다.

| 프로젝트 | 정체 | 연결 방식 | 상태 |
|---|---|---|---|
| **(a) CoplayDev MCP for Unity** — *이 Power가 사용하는 것* | UPM `com.coplaydev.unity-mcp`, 저장소 [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp), Python 서버는 PyPI의 `mcpforunityserver`, MIT 라이선스 | 기본은 streamable HTTP, 엔드포인트 `http://127.0.0.1:8080/mcp`. 또는 `uvx`를 통한 stdio. Unity 측 브리지는 TCP `6400`도 수신 | 활성. 확인된 최신 릴리스는 **v10.3.0**(2026-10-04). 이 Power가 문서화하는 범위는 **v10.3.0 이상, 최소 v10.0.0**. 10개 그룹에 걸쳐 **49**개 도구 엔트리포인트 — 10.3.0에서 `manage_tools(action: "list_groups")`를 실제로 호출해 센 값이며 이 수치가 기준입니다(업스트림 README는 48로 표기) |
| **(b) IvanMurzak/Unity-MCP** — *다른 프로젝트, 여기서는 사용하지 않음* | UPM `com.ivanmurzak.unity.mcp`, 저장소 [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 별도 서버 바이너리를 `Library/mcp-server/`에 자동 다운로드. 포트는 프로젝트 경로의 해시에서 유도(20000–29999 범위)되므로 설정할 포트가 없음 | 활성, 최신 1.3.0(2026-10-20경). 도구 이름과 포트 방식이 이 Power와 **일치하지 않음** |
| **(c) Unity 자체 Editor 내장 MCP 서버** | `com.unity.ai.assistant`에 포함. UI는 `Edit > Project Settings > AI > Unity MCP` | MCP 클라이언트가 Editor 내장 서버에 직접 연결 | **더 이상 권장되지 않음(deprecated)** — 아래 참조 |

**(c)의 deprecated 상태, 그리고 그것이 이 Power에 영향을 주지 않는 이유.** Unity 문서는 Editor 내장 AI assistant 패키지 안의 MCP 서버가 deprecated 되었으며 Unity CLI(`unity mcp`)가 그 자리를 대신하고, CLI가 동일한 프로토콜을 사용하는 자체 MCP 서버를 함께 제공한다고 명시합니다([Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli), 2026-10-21 조회. 같은 공지가 패키지 문서 [com.unity.ai.assistant — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html), 2026-10-21 조회에도 있습니다). **같은 Unity 페이지는 에이전트에게 Unity 접근 권한을 주기 위해 GitHub에서 설치하는 서드파티 MCP 패키지는 이 deprecation의 영향을 받지 않는다고 명시합니다.** 따라서 (a) — 이 Power가 사용하는 브리지 — 는 deprecation 범위 밖이며, 그 때문에 이 Power가 구식이 된 것은 아닙니다.

## 사전 요구사항

- [Unity Editor](https://unity.com/) 설치 및 프로젝트 열기 (개인 및 소규모 팀을 위한 무료 Personal 라이선스 제공) — 대상은 Unity 6.4이며 이 Power의 최소 지원은 Unity 6.0입니다
- [Kiro IDE](https://kiro.dev/docs/getting-started/installation) 설치
- **MCP for Unity v10.3.0 이상(최소 v10.0.0)** — 프로젝트에 설치된 `com.coplaydev.unity-mcp`가 9.6.8 이하라면 업그레이드하세요. 9.6.8 → 10.3.0 변경은 도구 추가뿐이므로 마이그레이션 비용이 없습니다. 시작하기 전에 [브리지 업그레이드: 반드시 함께 맞춰야 하는 두 개의 버전 고정](#브리지-업그레이드-반드시-함께-맞춰야-하는-두-개의-버전-고정)을 읽으세요. C# 패키지와 Python 서버는 각각 따로 버전이 고정되며, 한쪽만 올리면 브리지가 망가집니다
- **Python 3.10 이상과 [`uv`](https://docs.astral.sh/uv/)** — 브리지의 서버는 `uv`/`uvx`로 실행되는 Python 패키지(PyPI의 `mcpforunityserver`)입니다. MCP for Unity 설치 마법사가 `uv`를 설치해 줄 수 있습니다. Windows에서 PATH에 여러 `uv.exe`가 있으면 "Choose UV Install Location"을 WinGet 심(`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`)으로 지정하세요
- Node.js 18+ (개발/타입 검사 전용 — 기본 사용에는 필요하지 않음. 설치가 필요한 경우 [Node.js 공식 사이트](https://nodejs.org/) 참조)

## 설치

### 단계 1 — Kiro에 이 Power 설치

Kiro → 왼쪽 패널에서 Powers 아이콘 클릭 → 「+」 버튼 클릭 → 「Add Custom Power」 선택 → 이 프로젝트의 루트 디렉토리 선택

![커스텀 Power 설치](image/Add-Kiro-Customer-Power.png)

### 단계 2 — unity-mcp 설치 및 Unity에서 MCP Server 시작

1. Unity Editor 열기 → Window → Package Manager

   ![단계 1: Package Manager 열기](image/Enable-Unity-MCP-Server-1.png)

2. 「+」 클릭 → 「Add package from git URL...」 → 아래 URL을 붙여넣고 Add 클릭. **끝의 `#v10.3.0` 태그는 고정입니다. `#main`으로 바꾸지 마세요:**

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0
   ```

   ![단계 2: git URL에서 패키지 추가](image/Enable-Unity-MCP-Server-2.png)

   > **이것은 바로잡은 지시입니다.** 이전 README는 `...?path=/MCPForUnity#main`을 사용하라고 안내했지만 그것은 틀렸고, **실제 설치 환경에서 이 실패를 재현해 확인했습니다(2026-10-21 실측)**. Unity는 git UPM 의존성을 **한 번만** 해석하고 그 결과 커밋을 캐시합니다. `#main`처럼 움직이는 ref는 브랜치를 **추적하지 않습니다**. 검증 머신의 `Packages/manifest.json`에는 `#main`이 적혀 있었지만 실제로 설치된 패키지는 여전히 **9.6.8**이었고 업스트림은 이미 **10.3.0**이었습니다 — 몇 달 동안 구버전에 갇혀 있었고 Package Manager에도 업데이트 알림이 전혀 뜨지 않았습니다. 몇 달 지난 브리지는 이 Power가 기록한 도구 집합과 맞지 않으므로, 이는 "AI가 Unity를 조작하지 못한다"의 직접적인 원인 중 하나입니다.

   태그를 고정한 git URL 외의 방법:

   - **OpenUPM**: `openupm add com.coplaydev.unity-mcp` — 레지스트리 설치이므로 새 버전이 나오면 Package Manager가 업데이트를 안내합니다
   - **Asset Store**: "MCP for Unity" 등록 항목 → Package Manager → My Assets

   **나중에 업그레이드할 때는 태그를 바꾸세요** — 의존성 문자열이 바뀌어야 Unity가 다시 해석합니다. `Packages/manifest.json`을 직접 편집하거나:

   ```json
   "com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0"
   ```

   …패키지를 제거한 뒤 새 태그로 git URL을 다시 추가하세요. 그다음 [브리지 업그레이드: 반드시 함께 맞춰야 하는 두 개의 버전 고정](#브리지-업그레이드-반드시-함께-맞춰야-하는-두-개의-버전-고정)을 따르세요 — UPM 패키지는 업그레이드의 절반일 뿐입니다.

3. 처음 임포트하면 패키지가 **설치 마법사(setup wizard)** 를 엽니다. 이후 상시 UI는 **Window → MCP for Unity** 이며, 여기서 서버 시작/중지, transport 전환, 클라이언트 재설정을 할 수 있습니다.

   ![단계 3: MCP 창 열기](image/Enable-Unity-MCP-Server-3.png)

   > 위 스크린샷은 메뉴 항목이 "Toggle MCP Window"였던 구버전에서 캡처한 것입니다. 현재 빌드의 경로는 `Window → MCP for Unity` 입니다.

4. 상태 패널이 **Connected**로 표시되는지 확인하고, 표시된 서버 엔드포인트/포트를 기록하세요(아래에서 사용합니다). 복구 동작은 `Restart Server` 입니다.

   ![단계 4: Server 실행 중 확인](image/Enable-Unity-MCP-Server-4.png)

### 등록 경로는 반드시 하나만 선택

Unity MCP 서버를 Kiro에 등록하는 메커니즘은 두 가지이며, 둘 다 **같은** 설정 파일에 서로 다른 이름으로 기록합니다. 둘을 모두 실행하면 동일한 Unity Editor를 가리키는 서버가 두 개 생겨 도구 목록이 중복되고 리소스 읽기 시 서버 이름이 모호해집니다.

- **경로 A — 이 Power가 서버를 등록하게 한다.** Power를 설치하고 그 `mcp.json`은 건드리지 마세요. Legacy(`POWER.md`) 형식 power의 MCP 서버는 `~/.kiro/settings/mcp.json`의 Powers 섹션에 Kiro가 네임스페이스를 붙인 이름으로 등록됩니다.
- **경로 B — Unity가 Kiro를 설정하게 한다.** Unity에서 `Window → MCP for Unity → Configure All Detected Clients`(또는 Kiro를 선택하고 `Configure Selected`). 패키지가 같은 파일에 `unityMCP`라는 이름의 서버 항목을 기록합니다.

> **Kiro의 MCP 패널에 Unity MCP 서버가 두 개 보이면 하나를 비활성화하고 Kiro를 재시작하세요.** 관련 설정 파일 위치 세 곳: 이 Power 자체의 `mcp.json`, 사용자 수준 `~/.kiro/settings/mcp.json`, 워크스페이스 수준 `.kiro/settings/mcp.json`.

### MCP 연결 설정

#### 자동 설정 (권장)

Unity에서 `Window → MCP for Unity`를 열고 → transport가 HTTP인지 확인한 뒤 → **Configure All Detected Clients**(또는 Kiro를 선택하고 **Configure Selected**)를 클릭합니다. Kiro는 정식 지원 클라이언트이므로 이 작업이 포트까지 정확한 항목을 `~/.kiro/settings/mcp.json`의 서버 키 `unityMCP`로 기록합니다.

#### 실제 포트 읽기

**8080을 상수로 여기지 마세요.** 포트는 서버가 시작될 때 `--http-url`에 전달된 값 그 자체이며 사용자가 변경할 수 있고, 8080은 다른 서비스와 충돌합니다(업스트림은 Tailscale을 예로 들며 8090으로 옮기라고 제안합니다). MCP for Unity 창이 현재 엔드포인트를 보여줍니다 — 8080이 아니라면 URL은 `http://127.0.0.1:<해당 포트>/mcp` 입니다.

포트는 디스크에서 바로 확인할 수도 있습니다. 실행 중인 서버는 Unity 프로젝트 아래에 포트 이름이 들어간 pidfile을 기록합니다.

```
<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid
```

`mcp_http_8080.pid`가 있으면 서버는 `http://127.0.0.1:8080`에서 동작 중입니다. 이 Power를 실제로 검증한 머신이 바로 그 상태였고, 서버 자체의 명령줄은 `mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile ...mcp_http_8080.pid` 였습니다.

#### 수동 설정 (최후의 수단)

위 두 단계로 동작하는 항목이 만들어지지 않은 경우에만 `mcp.json`을 편집하세요.

HTTP 모드 (기본 transport — 로컬 전용, Unity Editor와 통신):

> **보안 참고**: 여기서는 의도적으로 HTTP를 사용합니다. 서버는 루프백(`127.0.0.1` / `::1`)에만 바인딩합니다. LAN 주소 바인딩에는 `Advanced Settings → Allow LAN Bind (HTTP Local)`이 필요하며, 원격 엔드포인트는 `https://`여야 합니다. 기본 구성에서는 트래픽이 머신 외부로 나가지 않으므로 HTTPS가 필요하지 않습니다.

```json
{
  "mcpServers": {
    "unity-mcp": {
      "url": "http://127.0.0.1:8080/mcp",
      "type": "http",
      "env": {},
      "disabled": false
    }
  }
}
```

> `8080`은 Unity 창에 표시된 포트로 바꾸세요. 모드 키 이름은 `transport`가 아니라 `type`입니다. `127.0.0.1`은 의도적입니다: 업스트림 문서는 `localhost`로 표기하지만 Unity 측의 기본값은 리터럴 `127.0.0.1`이며, Windows에서는 `localhost`가 `::1`로 먼저 해석될 수 있습니다.

Stdio 모드 (대체 — MCP 서버를 Kiro가 관리하는 자식 프로세스로 실행). PyPI 배포명은 **`mcpforunityserver`**, 콘솔 엔트리포인트는 **`mcp-for-unity`** 이며 `--transport stdio`가 필수입니다. PyPI에는 `unity-mcp`라는 패키지가 **없습니다** — 이전 버전 README가 적어 둔 `uvx unity-mcp`가 한 번도 실행되지 않았던 이유가 이것입니다.

Windows (`uvx.exe`를 절대 경로로. WinGet 심이 권장됨):

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "C:/Users/<you>/AppData/Local/Microsoft/WinGet/Links/uvx.exe",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"],
      "type": "stdio",
      "env": {},
      "disabled": false
    }
  }
}
```

macOS/Linux (PATH의 `uvx`로 보통 충분합니다):

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "uvx",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"],
      "type": "stdio",
      "env": {},
      "disabled": false
    }
  }
}
```

### 브리지 업그레이드: 반드시 함께 맞춰야 하는 두 개의 버전 고정

MCP for Unity는 **두 개의 구성 요소이며, 각각 별도로 버전을 고정합니다.** 업그레이드할 때 가장 혼란스러운 지점이 바로 이것입니다. 아래 내용은 모두 **2026-10-21**에 실제 머신에서 수행하고 관찰한 9.6.8 → 10.3.0 업그레이드 기록입니다.

| 구성 요소 | 무엇인지 | 버전이 고정되는 위치 |
|---|---|---|
| UPM 패키지(C# Editor 측) | Unity 프로젝트에 임포트되는 `com.coplaydev.unity-mcp` | `Packages/manifest.json` — git 태그 또는 레지스트리 버전 |
| Python MCP 서버 | PyPI의 `mcpforunityserver`, 실행 엔트리는 `mcp-for-unity` | Unity가 작성하는 실행 명령줄의 `--from "mcpforunityserver==<버전>"` 인자 |

업그레이드 전에 관측한 서버 실행 명령줄(그대로 기록):

```
uvx --from "mcpforunityserver==9.6.8" mcp-for-unity --transport http --http-url http://127.0.0.1:8080
  --project-scoped-tools --pidfile <UnityProject>\Library\MCPForUnity\RunState\mcp_http_8080.pid
  --unity-instance-token <token>
```

**UPM 패키지만 올려도 Python 서버는 올라가지 않습니다.** manifest를 `#v10.3.0`으로 바꾸고 Unity가 v10.3.0의 C#을 깔끔하게 임포트·컴파일한 뒤에도, 실행 중인 서버는 여전히 버전 `9.6.8`을 보고했습니다 — 오래된 캐시 사본을 실행하고 있었기 때문입니다.

**버전 불일치는 브리지를 망가뜨리며, 그 방식이 "선택적"이라 판단하기가 매우 어렵습니다.** C#이 10.3.0, Python이 9.6.8인 상태에서 Unity가 필요한 모든 도구 호출은 `{"success":false,"error":"Unity session not available; please retry","data":{"reason":"no_unity_session",...}}`를 반환했지만, 서버 계층만으로 처리되는 도구(`debug_request_context` 등)는 계속 정상 응답했습니다. 서버는 멀쩡해 보이는데 Unity에 닿는 작업은 하나도 되지 않습니다.

#### 업그레이드 절차

1. **UPM 버전 고정을 변경** — `Packages/manifest.json`의 태그를 편집하거나, 패키지를 제거한 뒤 새 태그로 git URL을 다시 추가하세요. `#main`처럼 움직이는 ref는 다시 해석되지 않습니다.
2. *선택 사항, 네트워크가 느릴 때 권장:* `uvx --from "mcpforunityserver==10.3.0" mcp-for-unity --help`로 **uv 캐시를 미리 준비**하세요. 실제 업그레이드에서 이 작업을 했기 때문에 Unity가 이후 `--offline`으로 서버를 띄울 수 있었습니다.
3. **Unity가 임포트·컴파일하도록** 두고, editor log에 `error CS`가 없는지 확인하세요.
4. **오래된 서버 프로세스 체인을 종료**(`uvx` → `uv` → `mcp-for-unity` → `python`). 스스로 새 버전으로 바뀌지 않습니다.
5. **남아 있는 pidfile을 삭제**(있는 경우): `<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid`. 실제 업그레이드에서는 프로세스를 종료한 뒤에도 이 파일이 남아 있어 직접 지워야 했습니다.
6. **Unity에서 서버를 시작**: `Window → MCP for Unity → Start Server`. **이 명시적인 동작이 반드시 필요했습니다** — 패키지 업그레이드 후에도, 프로세스 체인을 종료한 뒤에도 서버는 스스로 재시작하지 않았습니다. 수동으로 시작하면, 이제 v10.3.0 C#을 실행 중인 Unity가 일치하는 버전 고정으로 서버를 다시 띄웁니다(`uvx --offline --from "mcpforunityserver==10.3.0" ...`). 새로운 uv 캐시 archive가 사용되고, 포트가 다시 수신 대기 상태가 되며, 두 구성 요소가 모두 10.3.0이 됩니다.
7. **Kiro의 MCP 서버를 재연결**(MCP Server 패널 → reconnect, 또는 Kiro 재시작). 업그레이드는 항상 클라이언트의 MCP 세션을 무효화합니다 — 다음 항목 참조.
8. **두 버전이 일치하는지 확인**: `debug_request_context`는 서버 버전을, `manage_packages(action: "list_packages")`는 패키지 버전을 보고합니다.

#### 비슷해 보이지만 전혀 다른 두 가지 오류

서버가 10.3.0으로 재시작한 뒤, 이미 연결되어 있던 클라이언트의 호출은 `{"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Session not found"}}`로 실패했습니다. 이것은 **MCP 전송 계층의 세션**이며 Unity 브리지가 아닙니다:

| 오류 | 어느 계층인가 | 해결 방법 |
|---|---|---|
| `Session not found`(`-32600`) | Kiro와 Python 서버 사이의 MCP 전송 세션 | Kiro의 MCP 서버를 재연결하거나 Kiro를 재시작하세요. 버전 고정과는 무관합니다 |
| `no_unity_session` / "Unity session not available" | Python 서버와 Editor 사이의 Unity 브리지 | 먼저 두 버전 고정을 일치시키세요. 이미 일치한다면 Editor가 열려 있는지, 컴파일 중이 아닌지 확인하세요. 재연결은 이 오류에 아무 도움이 되지 않습니다 |

#### v10.3.0은 무엇인가

v10.3.0은 현재의 정식(prerelease 아님) 릴리스입니다(GitHub 태그 `v10.3.0`, 2026-10-04 공개, 에셋 `unity-mcp-10.3.0.mcpb`). 대응하는 `mcpforunityserver-10.3.0`도 PyPI에 있습니다(같은 분에 업로드, Python 3.10 이상 필요). 이 Power와 관련된 릴리스 노트 항목: Unity 6000.6의 `InstanceIDToObjectCompat` 수정, stdio가 재연결 백오프 전에 포트 탐색을 갱신하도록 한 수정, `read_console`이 Console 창의 필터 때문에 항목이 가려지지 않게 한 수정, 도구가 도구 목록에 없을 때 어디를 봐야 하는지에 대한 업스트림 문서 추가, 새로운 Blender Bridge, 그리고 fal / OpenRouter 에셋 생성 모델의 자동 탐색.

v10.3.0의 서버 CLI(10.3.0에서 `mcp-for-unity --help`)는 `--default-instance`, `--transport {stdio,http}`, `--http-url`, `--http-host`, `--http-port`, `--http-remote-hosted`, `--api-key-*` 계열(원격 호스팅 인증용), `--unity-instance-token`, `--pidfile`, `--project-scoped-tools`를 받습니다. 이로써 위의 stdio 대체 설정 형식이 맞다는 것도 확인되었습니다. 덧붙일 점은 하나뿐입니다: `--from`에 버전을 고정하는 것이 실제 관행이며, Unity 자체 런처도 그렇게 합니다.

#### 도구 집합이 실제로 무엇이 바뀌었나 (실측)

업그레이드 후 클라이언트가 다시 연결되어 v10 도구를 직접 호출해 확인했습니다. 같은 머신에서 실제 도구 목록은 9.6.8의 **43개**에서 10.3.0의 **49개**가 되었습니다. 추가된 6개는 `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`, `import_model`, `import_model_file`입니다. **제거되거나 이름이 바뀐 도구는 하나도 없으므로** 이 Power에는 이번 업그레이드에 따른 마이그레이션 비용이 없습니다. 숫자는 49를 기준으로 하세요 — 업스트림 README는 "48 focused MCP tool entrypoints"라고 쓰고 있지만 실측값이 우선입니다.

추가된 6개는 모두 새로운 열 번째 도구 그룹 **`asset_gen`**에 속하며, `manage_tools(action: "list_groups")`는 이 그룹을 `enabled: false`, `default_enabled: false`로 반환했습니다. **기본적으로 꺼져 있다는 점은 실측으로 확인했고, 이것이 올바른 안전 기본값입니다**: 이 도구들은 유료 외부 서비스를 개발자 본인의 API 키로 호출해 3D 모델, 이미지, 오디오를 생성합니다. 이 그룹을 활성화하는 것은 과금되는 도구를 에이전트 앞에 늘어놓는 것과 같으므로, 이 Power는 어떤 워크플로도 그쪽으로 라우팅하지 않으며 검증 과정에서도 여섯 도구를 **한 번도 호출하지 않았습니다**. 나머지 아홉 그룹은 9.6.8과 동일했습니다.

알아둘 만한 보안 개선이 하나 더 있습니다: 10.3.0의 `debug_request_context`는 `--unity-instance-token` 값을 `***`로 마스킹합니다. 9.6.8에서는 평문으로 출력되었습니다. 디버그 출력을 공유하기 전에 한 번 확인하는 것은 여전히 좋은 습관이지만, v10에서는 그 중요도가 훨씬 낮아졌습니다. `session_state` 블록도 9.6.8이 반환했던 `derived_key` / `all_keys_in_store` 필드를 더 이상 반환하지 않습니다.

#### 쓰기 경로에서 확인된 것, 그리고 호출을 이어 붙이는 방식을 바꾸는 발견 하나

마지막 라운드는 읽기만 하지 않고 실제로 프로젝트에 썼습니다. 모든 쓰기는 격리된 `Assets/_MCPVerify/` 폴더 안에서 수행하고 오브젝트 이름은 `MCPVerify_*`로 통일했으며, 작업이 끝난 뒤 전부 삭제했습니다. 그다음 프로젝트가 원래 기준 상태로 돌아왔음을 확인했습니다 — `SampleScene`은 원래의 루트 오브젝트 3개와 원래의 component 구성을 유지하고 있고, `.cs` 애셋은 0개입니다.

**10.3.0에서 검증 완료**: `manage_asset`의 폴더 생성/삭제, `create_script`, `get_sha`, `validate_script`, `find_in_file`의 성공 경로, `script_apply_edits`, `delete_script`, `manage_gameobject`의 create/modify/duplicate/delete, `manage_components`의 add와 set_property, `manage_prefabs(create_from_gameobject)`, `refresh_unity`, 그리고 `run_tests` → `get_test_job` 비동기 job 라이프사이클 전체(`running` → `succeeded`, 약 7.5초). 프로젝트에 test assembly가 없으므로 **라이프사이클은 확인되었지만 통과/실패 보고는 확인되지 않았습니다**.

**instance ID는 변합니다. 여러 단계를 이어 붙이는 작업에 가장 큰 영향을 주는 발견입니다.** 방금 생성한 GameObject가 반환한 ID는 **음수**(`-5560`)였고, Unity가 해당 오브젝트를 등록한 뒤에는 그 ID로 더 이상 찾을 수 없었으며(`not found using method 'by_id'`) 오브젝트는 다른 양수 ID(`50436`, 이후 `50470`)로 응답했습니다. 더 까다로운 점은 `refresh_unity` 재컴파일 이후 **아무도 건드리지 않은 오브젝트까지 번호가 다시 매겨졌다는** 것입니다 — Main Camera 49224 → 50412, Directional Light 49234 → 50422, Global Volume 49242 → 50430. 그러므로 단계 사이에 넘기는 값은 오브젝트의 **이름 또는 경로**여야 하고, instance ID가 필요하면 그것을 사용하는 호출 바로 직전에 다시 조회하며, 재컴파일이나 domain reload를 넘어 ID를 들고 가지 마십시오.

같은 라운드에서 작은 수정 세 가지도 나왔습니다. 세 개의 오브젝트 도구는 `target` 해석이 서로 다릅니다(`manage_components`는 정수 ID를 받고, `manage_gameobject`는 **문자열**이 필수이며 기본적으로 **이름**으로 해석하고, `manage_prefabs`는 **이름**이 필수) — 이름을 넘기면 세 도구 모두에서 통합니다. `script_apply_edits`가 받는 것은 **`name` + `path`**이며 `uri`가 아닙니다. `refresh_unity`의 `mode`와 `compile`은 모두 문자열 enum(`if_dirty`/`force`와 `none`/`request`)이라 `compile: true`는 거부됩니다. 또한 `manage_gameobject(duplicate)`는 `name`을 무시하고 Unity 자체의 `<원본>_Copy`를 만들며, Unity 6.4의 현행 `linearDamping`(obsolete가 된 `drag`의 대체)이 `manage_components`를 통해 설정된다는 점도 확인했습니다.

### 자동 가이드 Hook 설치 (권장)

이 Power는 `UserPromptSubmit` hook (Kiro 1.0 `v1` 스키마)을 제공하며, 각 요청 처리 전에 AI에게 Power 활성화와 적절한 Steering File 로드를 자동으로 알려줍니다.

```bash
mkdir -p .kiro/hooks
cp hooks/unity-power-auto-activate.json .kiro/hooks/unity-power-auto-activate.json
```

### 연결 확인

Kiro에서 Unity 관련 명령을 입력합니다(예: "현재 씬의 모든 오브젝트를 나열해줘"). Kiro가 올바르게 응답하면 연결이 성공한 것입니다.

## 사용법

원하는 작업을 자연어로 Kiro에게 알려주세요. Kiro가 자동으로 적절한 MCP 도구를 선택하여 실행합니다.

### 예시 명령

```
"Characters 폴더의 모든 모델을 Humanoid rig으로 설정해"
"3D 1인칭 씬을 만들어"
"Windows용으로 빌드해"
"프로젝트의 코드 아키텍처를 검사해"
"Android 플랫폼 호환성을 확인해"
"hero.fbx의 의존성을 분석해"
```

> **참고**: Unity는 게임, 시뮬레이션, 교육 도구, 건축 시각화 등 다양한 프로젝트에 사용됩니다. 아래 데모는 일반적인 Unity 워크플로우 패턴을 인터랙티브 3D 씬을 예시로 사용하여 시연합니다. 이러한 워크플로우 패턴(씬 설정, 코드 품질 검사, 성능 분석, 플랫폼 호환성)은 모든 Unity 프로젝트 유형에 동일하게 적용됩니다 — 상업용 게임, 교육 도구, 연구 시뮬레이션, 건축 시각화, 개인 아트 프로젝트, 또는 Unity를 처음 배우는 경우에도 활용할 수 있습니다. 예를 들어, 건축 시각화 프로젝트는 FPSController를 WalkController로 교체하고 측정 UI를 추가할 수 있으며, 교육 시뮬레이션은 StudentController와 평가 시스템을 사용하여 동일한 워크플로우 패턴을 적용할 수 있습니다.

### 데모: 인터랙티브 씬 만들기 및 전체 품질 검사 실행

#### 1단계: 게임 만들기

**스텝 1 — 플레이 가능한 3D 씬 구축**

```
다음을 포함하는 3D 1인칭 씬을 만들어:
- 지형 (기복이 있는 초원)
- 방향광과 환경광
- 1인칭 컨트롤러 (WASD 이동 + 마우스 시점)
- 인터랙티브 오브젝트 (박스와 실린더)
- HUD Canvas에 조준점과 상태 표시
씬 이름을 Level01로 지정하고 저장
```

**스텝 2 — 인터랙티브 게임플레이 메커니즘 추가**

```
핵심 인터랙션 게임플레이 추가:
1. 인터랙션 시스템: 좌클릭으로 상호작용, Raycast 히트 감지, 오브젝트가 시각적 피드백으로 반응
2. 3개의 타겟 오브젝트 (컬러 캡슐)이 씬에서 천천히 이동
3. 오브젝트는 3번 상호작용 후 비활성화되며 파티클 이펙트 재생
4. 점수 시스템: 좌상단 점수 표시, 성공적 상호작용당 +100
5. 모든 타겟이 클리어되면 "YOU WIN" 표시
```

**스텝 3 — 레벨 설정 시스템 생성**

```
LevelConfig이라는 ScriptableObject 생성: 레벨 이름(string), 난이도(int, 1-10),
시간 제한(float), 적 웨이브 리스트(중첩: 적 타입 string + 수량 int + 스폰 딜레이 float),
커스텀 Inspector 생성
```

#### 2단계: 품질 검사 및 최적화

**스텝 4 — 코드 품질 검사**

```
모든 C# 코드를 MVC 아키텍처 규칙에 대해 검사, 네이밍 규칙,
레이어 의존성과 순환 참조를 스캔, 모든 위반 사항을 수정 제안과 함께 나열
```

**스텝 5 — 성능 스캔**

```
모든 C# 스크립트의 성능 안티패턴을 스캔, 현재 씬의 Draw Calls와
메모리 사용량을 분석, 심각도 순으로 정렬된 완전한 성능 보고서 생성
```

**스텝 6 — 크로스 플랫폼 검사**

```
모든 Shader의 Android 및 iOS 플랫폼 호환성 검사, 메모리 예산 검증,
문제를 Error/Warning/Suggestion으로 분류, 호환되지 않는 Shader에 대안 제공
```

**스텝 7 — 빌드 및 결과 확인**

```
Android release 설정으로 프로젝트 빌드, 빌드 로그의 오류 파싱,
각 오류의 타입, 파일 위치, 수정 제안 나열
```

## 개발

`src/`의 TypeScript 모듈은 각각 독립적입니다 — 번들러도, 빌드 단계도 없습니다. 테스트 스위트와 TypeScript 컴파일러 설정 파일은 개발자 로컬 파일(git 무시 대상)이므로, 새로 클론한 상태에는 구성된 테스트 러너가 없습니다. 타입 검사는 컴파일러 플래그를 명시해 실행하세요:

```bash
npm install   # devDependencies만 — 이 Power 자체에는 런타임 의존성이 없습니다

# 타입 검사 (bash)
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck src/*.ts
```

```powershell
# 타입 검사 (PowerShell)
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck (Get-ChildItem src -Filter *.ts | ForEach-Object FullName)
```

## 프로젝트 구조

```
kiro-unity-accelerator/
├── POWER.md                    # Kiro 메인 문서
├── mcp.json                    # MCP Server 연결 설정
├── steering/                   # 도메인 지식 Steering Files (15개)
├── templates/                  # 내장 템플릿
│   ├── presets/                # 에셋 프리셋 (5개)
│   ├── scaffolds/              # 씬 스캐폴드 (5개)
│   ├── build-configs/          # 빌드 설정 (4개)
│   ├── platform-profiles/      # 플랫폼 프로파일 (5개, XR/VR 포함)
│   ├── architecture-rules/     # 아키텍처 규칙 (3개)
│   └── workflows/              # 워크플로우 템플릿 (3개)
├── src/                        # TypeScript 도구 모듈 (40+)
├── hooks/                      # Hook 템플릿 (.kiro/hooks/ 로 복사)
├── workshop/                   # 단계별 프롬프트 튜토리얼
├── image/                      # 문서 이미지
└── package.json
```

## 문제 해결

| 문제 | 해결 방법 |
|------|-----------|
| Kiro가 Unity에 연결할 수 없음 | Unity Editor가 프로젝트를 열어 둔 상태인지 확인 → `Window → MCP for Unity` → 상태 패널이 **Connected**인지 확인(아니면 `Restart Server`) |
| Unity 관련 호출이 모두 `Unity session not available; please retry` / "`"reason":"no_unity_session"`"을 반환하는데 `debug_request_context`는 정상 응답함 | **가장 먼저 의심할 것은 C# 패키지와 Python 서버의 버전 불일치입니다.** 2026-10-21 실측 확인 — C#이 10.3.0이고 Python이 9.6.8일 때의 증상이 바로 이것이며, 선택적으로 실패하므로 서버가 멀쩡해 보입니다. `debug_request_context`로 서버 버전을, `manage_packages(action: "list_packages")`로 패키지 버전을 확인하고 다르면 [업그레이드 절차](#업그레이드-절차)를 따르세요. 이미 일치한다면 Editor가 열려 있는지, 컴파일 중이 아닌지 확인하세요. `Session not found`와는 **다른** 문제이며, Kiro를 재연결해도 해결되지 않습니다 |
| `Session not found`(JSON-RPC `-32600`) | **MCP 전송 계층의 세션**이 사라진 것이며, 거의 항상 서버가 재시작되었기 때문입니다. Kiro의 MCP Server 패널에서 재연결하거나 Kiro를 재시작해 새 세션을 받고 도구 목록을 다시 읽으세요. 브리지를 업그레이드할 때마다 반드시 발생합니다. `no_unity_session`(Unity 브리지 계층)과는 다릅니다 |
| 구버전 브리지에 머물러 있고 업데이트 안내도 없음 | `Packages/manifest.json`을 확인하세요. 해당 줄이 `#main`으로 끝난다면 Unity는 한 번 해석한 결과를 캐시해 둔 것이며 브랜치를 추적하지 않습니다. 명시적인 태그(`#v10.3.0`)로 바꿔 재해석을 강제한 뒤 [업그레이드 절차](#업그레이드-절차)를 따르세요 |
| 포트 8080이 사용 중 | MCP for Unity 설정에서 포트를 변경(업스트림은 8090 제안)하고 **Configure All Detected Clients**를 다시 실행, Kiro 재시작, `mcp.json`의 `url`을 Unity 창에 표시된 포트와 일치시키기 |
| 문서에 있는 도구가 존재하지 않는다고 보고됨 | 해당 도구의 그룹이 비활성일 수 있습니다 — bridge가 선언한 기본값은 `core` 하나지만, 실제로 검증한 머신에서는 아무 활성화 없이 모든 도구가 호출되었습니다. `manage_tools(action: "list_groups")` → `manage_tools(action: "sync")` → `manage_tools(action: "activate", group: "<이름>")` 순서로 실행한 뒤 MCP 서버를 새로고침하거나 재연결하세요(Kiro가 도구 목록을 캐시할 수 있습니다). `list_groups`는 정상 동작하는 그룹에도 `enabled: false`를 보고할 수 있으므로, 그 필드가 아니라 재시도 성공 여부로 판단하세요 |
| `Tool call denied by user's permissions` | Unity에 도달하기 전에 Kiro의 권한 규칙이 호출을 거부한 것이며 bridge 문제가 아닙니다. Kiro는 이 Power의 서버를 `power-kiro-unity-accelerator-unity-mcp`로 노출하므로, `~/.kiro/settings/permissions.yaml`(및 워크스페이스 수준의 같은 파일)에서 `capability: mcp` + `effect: deny`로 `power-<powerName>-<serverName>/<tool>`에 일치하는 규칙이 있는지 확인하고, 해당 도구를 쓰려면 규칙을 완화하세요. 이 Power를 검증한 머신에서는 그 규칙이 `manage_build`를 거부해 빌드 워크플로 전체를 실행할 수 없었습니다 |
| `batch_execute` 안에서 `Unknown action` 발생 | `batch_execute`는 명령을 Unity로 바로 전달하면서 bridge의 Python 서버 계층을 우회합니다. 그래서 서버 계층 action은 실제로 동작해도 배치 안에서는 실패합니다. 해당 호출 하나를 **직접 호출**로 다시 실행한 뒤에 action의 존재 여부를 판단하세요 |
| Unity MCP 서버가 두 개 등록됨 | `~/.kiro/settings/mcp.json`과 Kiro의 MCP 패널을 확인하세요. 이 Power의 항목과 `unityMCP`가 모두 있으면 하나를 비활성화하고 Kiro를 재시작하세요("등록 경로는 반드시 하나만 선택" 참조) |
| Unity 6.3+ 에서 Unity AI Assistant 패키지를 설치한 경우 | AI Assistant가 포함한 `System.Collections.Immutable`이 `validate_script` / `execute_code`가 쓰는 Roslyn 의존성이 요구하는 버전보다 최신입니다. 업스트림의 해결책은 `System.Collections.Immutable` v9.0.0을 `Assets/Plugins/`에 두는 것입니다 |
| 에셋 작업 무응답 | Unity가 컴파일 중일 수 있음. 컴파일 완료를 기다리거나 `mcpforunity://editor/state` 리소스로 상태를 확인하세요 |
| TypeScript 타입 오류 | 위 "개발" 섹션의 플래그 기반 타입 검사를 실행하고 `npm install`이 완료되었는지 확인 |

## 보안

자세한 내용은 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)을 참조하세요.

## 라이선스

이 라이브러리는 MIT-0 라이선스로 제공됩니다. [LICENSE](LICENSE) 파일을 참조하세요.
