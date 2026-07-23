# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

> **언어 안내**: 이 README는 한국어 버전입니다. 위 링크에서 다른 언어 버전을 선택할 수 있습니다. Steering 파일(도메인 지식)은 중국어 번체로 작성되어 있으며 영어 요약이 각 파일 상단에 포함되어 있습니다. Steering 파일을 직접 읽을 필요 없이, 원하는 언어(한국어, 영어, 일본어, 중국어)로 도구와 상호작용하면 자동으로 해당 언어로 응답합니다. 언어 관련 문제가 있으면 이슈를 열어주세요.

Kiro를 Unity 개발 AI 어시스턴트로 전환하세요. MCP(Model Context Protocol — AI 어시스턴트가 개발 도구와 상호작용하기 위한 표준화된 프로토콜로, 메뉴를 직접 탐색하거나 반복적인 기본 코드(boilerplate)를 작성하는 대신 자연어로 원하는 작업을 설명할 수 있게 해줍니다)를 통해 자연어로 Unity Editor를 제어하며, 에셋 관리, 씬 구축, 빌드 자동화, 성능 분석, 코드 품질 검사 등을 지원합니다 — 40개 이상의 TypeScript 도구 모듈과 14개의 도메인 지식 파일을 내장하고 있습니다.

> **Unity 6.x 최신 반영, 실제 프로젝트 검증 우선**: Steering 가이드는 Unity 6의 각 업데이트 릴리스에서 변경된 동작을 다룹니다. URP의 기본 렌더링 경로가 된 Render Graph, GPU Resident Drawer(Forward+/Deferred+ 전용 GPU 인스턴싱 기반 드로우 콜 절감), 일부 버전의 신규 프로젝트에 기본 적용되는 "씬만 다시 로드(도메인 리로드 없음)" Play Mode 동작, 실험적 단계인 CoreCLR 스크립팅 백엔드, 그리고 Unity가 공식적으로 밝힌 OculusXR 패키지에서 OpenXR로의 전환 방향 등이 포함됩니다. 이 Power는 기억된 버전 번호만으로 동작을 단정하지 않고, MCP를 통해 연결된 프로젝트의 실제 Unity 버전, 현재 활성화된 렌더 파이프라인, 렌더링 경로, 스크립팅 백엔드, 설치된 패키지를 확인한 뒤에 버전별 권장 사항을 적용합니다.

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
- **빌드 자동화** — 로컬 빌드, 빌드 로그 파싱, 선택적 클라우드 가속
- **크로스 플랫폼 테스트** — 로컬 시뮬레이션 테스트, 결과 포맷팅, 테스트 스위트 변환
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
├── steering/       → 14 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## 사전 요구사항

- [Unity Editor](https://unity.com/) 설치 및 프로젝트 열기 (개인 및 소규모 팀을 위한 무료 Personal 라이선스 제공)
- [Kiro IDE](https://kiro.dev/docs/getting-started/installation) 설치
- Node.js 18+ (개발/테스트 전용 — 기본 사용에는 필요하지 않음. 설치가 필요한 경우 [Node.js 공식 사이트](https://nodejs.org/) 참조)

## 설치

### 단계 1 — Kiro에 이 Power 설치

Kiro → 왼쪽 패널에서 Powers 아이콘 클릭 → 「+」 버튼 클릭 → 「Add Custom Power」 선택 → 이 프로젝트의 루트 디렉토리 선택

![커스텀 Power 설치](image/Add-Kiro-Customer-Power.png)

### 단계 2 — unity-mcp 설치 및 Unity에서 MCP Server 시작

1. Unity Editor 열기 → Window → Package Manager

   ![단계 1: Package Manager 열기](image/Enable-Unity-MCP-Server-1.png)

2. 「+」 클릭 → 「Add package from git URL...」 → 아래 URL을 붙여넣고 Add 클릭:

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
   ```

   ![단계 2: git URL에서 패키지 추가](image/Enable-Unity-MCP-Server-2.png)

3. 설치 완료 후, Window → Toggle MCP Window로 이동

   ![단계 3: MCP 창 열기](image/Enable-Unity-MCP-Server-3.png)

4. MCP Server 상태가 녹색(실행 중)인지 확인하고, 서버가 MCP 엔드포인트(Unity MCP 창에 표시됨)에서 수신 대기 중인지 확인

   ![단계 4: Server 실행 중 확인](image/Enable-Unity-MCP-Server-4.png)

### MCP 연결 설정

#### 자동 설정 (권장)

MCP for Unity 창에서 「Kiro」를 선택하고 「Configuration」을 클릭하여 연결을 자동 설정합니다.

#### 수동 설정

자동 설정을 사용할 수 없는 경우 `mcp.json`을 편집하세요.

HTTP 모드 (기본 — 로컬 전용, Unity Editor와 통신):

> **보안 참고**: 여기서는 의도적으로 HTTP를 사용합니다. 이 엔드포인트는 `localhost`(루프백 인터페이스)에서 실행되는 Unity Editor와만 통신합니다. 트래픽이 머신 외부로 나가지 않으므로 HTTPS가 필요하지 않습니다.

```json
{
  "mcpServers": {
    "unity-mcp": {
      "url": "<your-mcp-server-url>",
      "transport": "http"
    }
  }
}
```

Stdio 모드 (대체):

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "uvx",
      "args": ["unity-mcp"],
      "transport": "stdio"
    }
  }
}
```

### 자동 가이드 Hook 설치 (권장)

이 Power는 `promptSubmit` hook을 제공하며, 각 요청 처리 전에 AI에게 Power 활성화와 적절한 Steering File 로드를 자동으로 알려줍니다.

```bash
mkdir -p .kiro/hooks
cp hooks/pre-unity-tool.kiro.hook .kiro/hooks/
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

```bash
npm install

npm test                 # 모든 테스트 실행
npm run test:unit        # 유닛 테스트만
npm run test:property    # 속성 테스트 (fast-check)
npm run test:integration # 통합 테스트만
npx tsc --noEmit         # TypeScript 타입 검사
```

## 프로젝트 구조

```
kiro-unity-accelerator/
├── POWER.md                    # Kiro 메인 문서
├── mcp.json                    # MCP Server 연결 설정
├── steering/                   # 도메인 지식 Steering Files (14개)
├── templates/                  # 내장 템플릿
│   ├── presets/                # 에셋 프리셋 (5개)
│   ├── scaffolds/              # 씬 스캐폴드 (5개)
│   ├── build-configs/          # 빌드 설정 (4개)
│   ├── platform-profiles/      # 플랫폼 프로파일 (5개, XR/VR 포함)
│   ├── architecture-rules/     # 아키텍처 규칙 (3개)
│   └── workflows/              # 워크플로우 템플릿 (3개)
├── src/                        # TypeScript 도구 모듈 (40+)
├── tests/                      # 테스트 스위트
│   ├── unit/                   # 유닛 테스트
│   ├── property/               # 속성 테스트 (fast-check)
│   └── integration/            # 통합 테스트
├── hooks/                      # Kiro hooks
├── image/                      # 문서 이미지
├── package.json
├── tsconfig.json
└── jest.config.ts
```

## 문제 해결

| 문제 | 해결 방법 |
|------|-----------|
| Kiro가 Unity에 연결할 수 없음 | Unity Editor가 열려 있는지 확인 → Window → MCP for Unity → Start Server |
| 포트 8080이 사용 중 | 충돌하는 프로세스를 종료하거나, `mcp.json`에서 stdio 모드로 전환 |
| 에셋 작업 무응답 | Unity가 컴파일 중일 수 있음, 컴파일 완료 대기 |
| 클라우드 어시스트 실패 | 자동으로 로컬 모드로 폴백, 핵심 기능에 영향 없음 |
| 테스트 실패 | `npm test`를 실행하여 상세 오류 메시지 확인 |
| TypeScript 타입 오류 | `npx tsc --noEmit` 실행, `npm install`이 완료되었는지 확인 |

## 보안

자세한 내용은 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)을 참조하세요.

## 라이선스

이 라이브러리는 MIT-0 라이선스로 제공됩니다. [LICENSE](LICENSE) 파일을 참조하세요.
