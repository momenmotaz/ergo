# ERD Engine - Design Guidelines

## Design Approach

**Selected Approach:** Design System - Material Design  
**Justification:** This is a developer-focused productivity tool requiring clarity, information density, and functional excellence over visual flair. The user explicitly requested "simple, developer-friendly" styling. Material Design provides robust patterns for complex tools with panels, toolbars, and interactive canvases.

**Reference Inspiration:** VS Code, Figma editor interface, Linear, draw.io  
These tools excel at balancing powerful functionality with clean, unobtrusive interfaces.

---

## Core Design Principles

1. **Function First:** Every pixel serves the diagram editing workflow
2. **Information Clarity:** Dense content presented without visual noise  
3. **Developer Familiarity:** Patterns that feel native to technical users
4. **Spatial Efficiency:** Maximize canvas space while keeping controls accessible

---

## Typography

**Font Stack:**
- Primary: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Monospace (DSL input): `'Fira Code', 'Consolas', 'Monaco', monospace`

**Type Scale:**
- Interface labels: 13px, medium weight
- DSL textarea: 14px, monospace, regular weight
- Button text: 14px, medium weight
- Panel headers: 15px, semibold weight
- Canvas element labels: 12-14px depending on element type

---

## Layout System

**Spacing Primitives:** Tailwind units of **2, 3, 4, 6, 8**
- Tight spacing (buttons, labels): p-2, gap-2
- Standard spacing (panels, sections): p-4, gap-4  
- Generous spacing (major sections): p-6, p-8

**Grid Structure:**
```
Left Panel: 400px fixed width
Right Panel (Canvas): flex-1 (remaining space)
Inspector Panel (if present): 280px fixed width, right side
```

**Responsive:** Not applicable - this is a desktop-only tool requiring minimum 1280px viewport

---

## Component Library

### A. Layout Components

**Left Panel:**
- Fixed 400px width with vertical flex layout
- DSL textarea: flex-1 height with monospace font, syntax-neutral styling
- Button group: horizontal flex, gap-2, bottom of panel
- Subtle border-right separator

**Canvas Container:**
- Full remaining width and height
- No background distractions - clean white or very subtle grid
- mxGraph renders here with native scrollbars

**Inspector Panel (Optional):**
- Collapsible right sidebar, 280px when open
- Property groups with clear section headers
- Form inputs for editing selected element properties

### B. Form & Input Components

**Textarea (DSL Input):**
- Monospace font, 14px line height 1.6
- Minimal border, subtle focus state
- No rounded corners (keep technical aesthetic)
- Light background tint to differentiate from canvas

**Buttons:**
- Standard rectangular, minimal rounding (rounded-sm or rounded-md)
- Clear hierarchy: Primary vs. secondary via fill vs. outline
- Group related actions with gap-2
- Heights: h-9 or h-10 for comfortable clicking

**Inspector Inputs:**
- Text fields, dropdowns, number spinners
- Compact vertical spacing (gap-3 between fields)
- Labels positioned above inputs, 13px semibold

### C. Navigation & Toolbar

**Top Toolbar (if needed):**
- Horizontal bar spanning full width
- Height: h-12
- Icons for undo/redo, zoom controls, alignment tools
- Use Material Icons or Heroicons via CDN

**Tool Palette (if implementing):**
- Vertical list of draggable template items
- Could be left panel above DSL input or collapsible sidebar
- Icons + short labels for entity types, attribute types, relationship types

### D. Canvas & Diagram Elements

**mxGraph Styling:**
- Clean, professional shapes with subtle shadows
- Entity rectangles: crisp corners, 2px borders
- Weak entities: double border with 3px spacing between lines
- Attributes (ellipses): 1.5px borders, slightly lighter than entities
- Relationships (diamonds): centered labels, clear connection points
- Use grayscale or very subtle color coding (avoid rainbow chaos)

**Connectors:**
- 1.5px solid lines, dark gray
- Clear arrowheads/cardinality notation
- Orthogonal or straight routing based on context

---

## Color Strategy

**Note:** Specific color values will be defined in implementation phase. Focus on structure:

- **Neutrals:** Use for panels, borders, text (gray-50 to gray-900 range)
- **Primary Accent:** Single accent color for active states, primary buttons
- **Semantic Colors:** Success (green), warning (amber), error (red) for validation feedback
- **Canvas:** White or very light gray background
- **Diagram Elements:** Neutral borders (gray-700), white fills, avoid bright colors

---

## Interaction Patterns

**Selection States:**
- Selected canvas elements: highlighted border, resize handles appear
- Active panel section: subtle background change

**Drag & Drop:**
- Clear drag affordances from tool palette
- Ghost preview during drag
- Drop zones highlighted on hover

**Inline Editing:**
- Double-click to edit labels directly on canvas
- Input field appears in-place with same styling as label

**Focus States:**
- Subtle outline for keyboard navigation
- No distracting glows or heavy shadows

---

## Animation & Motion

**Minimal Animation:**
- Panel expand/collapse: 150ms ease
- Button hover states: instant or 50ms
- NO animated diagram elements
- NO scrolling parallax or page transitions
- Canvas zoom/pan: native mxGraph behavior only

---

## Accessibility

- Keyboard shortcuts for parse, export, undo, redo
- Focus visible indicators on all interactive elements
- Sufficient color contrast (WCAG AA minimum)
- Proper ARIA labels for toolbar icons
- Resizable panels if implementing multi-column layout

---

## Images

**No images required.** This is a pure productivity tool with no marketing content. All visuals are user-generated diagrams.

---

## Key Takeaways

- **Ruthlessly functional:** No decorative elements
- **Information density:** Comfortable cramming of controls and content
- **Developer-native feel:** Patterns familiar from VS Code, Figma, draw.io
- **Spatial economy:** Every panel serves the core editing workflow
- **Clean typography hierarchy:** Distinguish interface labels from DSL code from diagram text