# CK-Grid v0.1.8

CK-Grid는 단순하고 예측 가능한 스프레드시트 스타일의 데이터 입력을 위해 설계된 초경량 JavaScript DataGrid 라이브러리입니다. 복잡한 설정이나 엔터프라이브 BI 기능을 지양하며, 본질적인 기능에 집중합니다.

## 🚀 주요 특징

- **고성능 가상 렌더링**: 대용량 데이터도 메모리 부하 없이 부드럽게 표시합니다.
- **예측 가능한 데이터 입력**:
  - 방향키, Tab, Enter를 이용한 직관적인 셀 이동.
  - 셀 선택 후 타이핑 시 즉시 편집 모드 전환.
  - 마우스 드래그 및 Shift 키를 이용한 범위 선택.
- **데이터 입력 모드 (Data Entry Mode)**:
  - 빈 데이터 세트로 시작 시 자동으로 첫 번째 입력 행 생성.
  - 마지막 행에서 **Enter** 또는 **ArrowDown** 입력 시 새로운 행 자동 추가.
  - 편집 중 **방향키** 입력 시 자동 저장 및 셀 이동 지원.
- **다양한 입력 컨트롤**:
  - **드롭다운(Select)**: `cellType: 'select'`를 통해 지정된 옵션 중 선택 가능.
  - **체크박스(Checkbox)**: `cellType: 'checkbox'`를 통해 boolean 데이터 즉시 토글.
- **고급 레이아웃**:
  - **틀 고정(Pinned Columns)**: 중요 열 좌/우 고정 기능.
  - **너비 자동 채우기(Auto-fit)**: `autoFitColumns: true` 설정 시 빈 공간 없이 컬럼 너비 자동 배분.
  - **2층 헤더(Grouped Header)**: `parentHeaderName` 설정을 통한 상위 그룹 헤더 및 셀 병합 지원.
  - **동적 열 조정**: 마우스 드래그를 이용한 너비 조절 및 정렬.
- **스타일링 및 서식**:
  - **조건부 행 서식(Row Styling)**: 데이터 값에 따라 행 전체의 배경색 및 스타일 지정.
  - **사용자 정의 셀 스타일**: 개별 셀 단위의 정교한 스타일링.
- **실용적인 기능 세트**:
  - **행 삭제**: 컨텍스트 메뉴를 통한 직관적인 행 삭제 기능.
  - **데이터 일괄 삭제**: `Delete` 키를 이용한 단일/다중 셀 데이터 초기화.
  - **Excel 호환 복사/붙여넣기**: 탭 구분(TSV) 방식 지원 및 지능형 붙여넣기(선택 영역 시작점 기준).
  - **실행 취소(Undo)**: 최근 변경 사항에 대한 안정적인 복구.
- **가벼운 무게**: 외부 라이브러리 의존성이 전혀 없는 Vanilla TypeScript 기반.

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
    autoFitColumns: true, // 너비 자동 채우기 활성화
    columns: [
        { field: 'id', headerName: 'ID', width: 70, sortable: true, pinned: 'left' },
        { 
            field: 'name', 
            headerName: '상품명', 
            parentHeaderName: '기본 정보', // 그룹 헤더 설정
            width: 200 
        },
        { 
            field: 'status', 
            headerName: '상태', 
            cellType: 'select', 
            options: ['대기', '진행', '완료'],
            width: 100 
        },
        { 
            field: 'active', 
            headerName: '활성', 
            cellType: 'checkbox', 
            width: 60 
        }
    ],
    data: myData,
    pagination: true
});
```

## 🛠 API 레퍼런스

### `GridOptions`

| 속성 | 타입 | 설명 |
| :--- | :--- | :--- |
| `container` | `HTMLElement` | 그리드가 그려질 부모 요소 |
| `columns` | `ColumnDef[]` | 컬럼 정의 배열 |
| `data` | `any[]` | 표시할 전체 데이터 배열 |
| `rowIdField` | `string` | 행 고유 식별 필드명 (기본값: 자동생성) |
| `pagination` | `boolean` | 페이징 사용 여부 |
| `autoFitColumns` | `boolean` | 그리드 너비에 맞춰 컬럼 너비 자동 조절 여부 |
| `allowAutoRowAddition` | `boolean` | 마지막 행에서 아래 방향키 입력 시 행 자동 추가 여부 (기본값: true) |
| `rowStyle` | `Function` | 행 스타일 지정 함수 (`({data, rowIndex}) => CSSProperties`) |
| `showRowNumber` | `boolean` | 행 번호 열 표시 여부 |
| `onCellChange` | `Function` | 셀 값이 변경될 때 호출 |
| `onRowSelect` | `Function` | 행이 선택될 때 실제 데이터 객체 배열 반환 |

### `ColumnDef`

| 속성 | 타입 | 설명 |
| :--- | :--- | :--- |
| `field` | `string` | 데이터 객체의 키 이름 |
| `headerName` | `string` | 헤더 표시텍스트 |
| `parentHeaderName` | `string` | 상위 그룹 헤더 명칭 (2층 헤더 구성 시 사용) |
| `width` | `number` | 열의 너비 (px) |
| `pinned` | `'left'\|'right'`| 열 고정 위치 |
| `type` | `'number'\|'date'\|'string'` | 데이터 타입 (자동 정렬/포맷팅 적용) |
| `cellType` | `'text'\|'select'\|'checkbox'` | 셀 입력 컨트롤 타입 |
| `options` | `string[]\|{label, value}[]` | `select` 타입 사용 시 드롭다운 옵션 |
| `editable` | `boolean` | 편집 가능 여부 (false 시 잠금) |
| `hidden` | `boolean` | 열 숨김 여부 |
| `renderHTML` | `boolean` | 셀 내용의 HTML 태그 렌더링 허용 여부 |
| `cellClass` | `string\|Function` | 사용자 정의 CSS 클래스 또는 클래스 반환 함수 |
| `cellStyle` | `Function` | 셀 스타일 지정 함수 (`({value, data, rowIndex}) => CSSProperties`) |
| `validator` | `Function` | 입력 값 검증 함수 (`(val) => true \| string`) |

### `CKGrid` 인스턴스 메소드

- **`updateData(data)`**: 데이터 교체 및 초기화.
- **`setColumnVisibility(field, visible)`**: 특정 열의 표시 여부를 동적으로 변경.
- **`exportCSV()`**: 현재 데이터를 CSV로 내보내기.
- **`undo()`**: 실행 취소.
- **`destroy()`**: 그리드 인스턴스 제거.

## 🎨 테마 커스텀 (CSS Variables)

`:root` 또는 그리드 부모 요소에 다음 변수를 설정하여 디자인을 변경할 수 있습니다.

```css
:root {
  --ck-grid-primary: #4caf50;    /* 강조 색상 */
  --ck-grid-bg: #ffffff;         /* 배경색 */
  --ck-grid-header-bg: #f0f0f0;  /* 헤더 배경색 */
  --ck-grid-selection-bg: rgba(76, 175, 80, 0.1);
}
```

## 📄 License

MIT License

Copyright (c) 2026 CK Apps

See the LICENSE file for details.
