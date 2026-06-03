# CK-Grid

CK-Grid는 Windows 데스크톱 응용 프로그램 수준의 고성능과 Excel 스타일의 사용자 경험을 제공하기 위해 설계된 초경량 JavaScript DataGrid 라이브러리입니다.

## 🚀 주요 특징

- **초고성능 가상 렌더링 (Virtualization)**: 10만 행 이상의 대용량 데이터도 메모리 부하 없이 60fps로 부드럽게 렌더링합니다.
- **Excel 스타일 인터페이스**:
  - **키보드 네비게이션**: 방향키, Tab, Enter를 이용한 자유로운 셀 이동.
  - **즉시 입력 (Immediate Typing)**: 셀 선택 후 타이핑 시 즉시 편집 모드로 전환되는 심리스한 경험.
  - **다중 셀 선택**: 마우스 드래그 및 Shift + 방향키를 이용한 범위 선택 및 통합 강조 테두리.
- **강력한 데이터 조작**:
  - **지능형 Ctrl+C / Ctrl+V**: Excel 호환 탭 구분(TSV) 방식 지원. 다중 행 선택 시 복사된 데이터를 순차적으로 자동 채우기(Looping) 지원.
  - **Ctrl+Z (Undo)**: 최근 100개의 변경 사항에 대한 무제한 실행 취소 지원.
- **고급 레이아웃 & 스타일링**:
  - **독립형 푸터바**: 스크롤 영역 외부에 고정된 페이지네이션 및 데이터 통계 컨트롤러.
  - **커스텀 스타일링**: 데이터 조건에 따른 동적 배경색, 글자색 지정 (`cellStyle`).
  - **유연한 서식**: 화폐, 날짜, 별점 등 사용자 정의 포맷터 지원 (`formatter`).
  - **동적 열 조정**: 실시간 드래그 열 너비 조절 및 SVG 기반 세련된 정렬 아이콘 (3단계 사이클 정렬).
- **제로 의존성**: 외부 라이브러리 없이 Vanilla TypeScript로만 제작되어 극한의 가벼움을 자랑합니다.

## 📦 설치 및 사용 방법

### 1. 라이브러리 포함
빌드된 `dist` 폴더 내의 파일들을 프로젝트에 복사하여 사용합니다.

```html
<!-- 스타일시트 임포트 -->
<link rel="stylesheet" href="./dist/style.css">

<!-- 라이브러리 임포트 (ES Module) -->
<script type="module">
    import { CKGrid } from './dist/ck-grid.js';
</script>
```

### 2. 그리드 초기화

```javascript
const grid = new CKGrid({
    container: document.getElementById('grid-container'),
    columns: [
        { field: 'id', headerName: 'ID', width: 70, sortable: true },
        { 
            field: 'price', 
            headerName: '단가', 
            width: 120,
            cellStyle: ({ value }) => value > 1000 ? { color: 'red', fontWeight: 'bold' } : {},
            formatter: ({ value }) => `₩${value.toLocaleString()}`
        }
    ],
    data: myLargeData,
    pagination: true, // 페이징 활성화
    pageSize: 100     // 페이지 당 행 수 설정
});
```

## 🛠 API 레퍼런스

### `GridOptions`

| 속성 | 타입 | 설명 |
| :--- | :--- | :--- |
| `container` | `HTMLElement` | 그리드가 그려질 부모 요소 (자동 Flex 레이아웃 적용) |
| `columns` | `ColumnDef[]` | 컬럼 정의 배열 |
| `data` | `any[]` | 표시할 전체 데이터 배열 |
| `rowHeight` | `number` | 각 행의 높이 (기본값: 30) |
| `headerHeight` | `number` | 헤더 영역 높이 (기본값: 35) |
| `pagination` | `boolean` | 하단 푸터바 및 페이징 사용 여부 (기본값: false) |
| `pageSize` | `number` | 한 페이지당 표시할 행 수 (기본값: 100) |

### `ColumnDef`

| 속성 | 타입 | 설명 |
| :--- | :--- | :--- |
| `field` | `string` | 데이터 객체의 키 이름 |
| `headerName` | `string` | 헤더 표시 텍스트 |
| `width` | `number` | 열의 고정 너비 (px) |
| `sortable` | `boolean` | 클릭 시 정렬 기능 활성화 여부 |
| `cellStyle` | `Function` | `({value, data, rowIndex}) => Partial<CSSStyleDeclaration>` |
| `formatter` | `Function` | `({value, data, rowIndex}) => string` (HTML 지원 안함, 텍스트만 가능) |

### `CKGrid` 인스턴스 메소드

- **`updateData(newData: any[])`**: 전체 데이터를 교체하고 첫 페이지부터 다시 렌더링합니다.
- **`updateOptions(options: Partial<GridOptions>)`**: 런타임 중에 페이징 여부, 행 높이 등의 설정을 즉시 변경합니다.

## 📄 라이선스
MIT License
