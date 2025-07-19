# DaVeenci Admin Dashboard - Design System Guide

## 🎨 Overview

This document serves as the comprehensive design system guide for the DaVeenci Admin Dashboard. It establishes consistent design principles, components, and patterns to ensure a cohesive and professional user experience across all features.

## 🌈 Color Palette

### Primary Colors
```css
/* Primary Blue - Used for main actions, navigation active states */
--primary-blue: #2563EB;      /* rgb(37, 99, 235) */
--primary-blue-hover: #1D4ED8; /* rgb(29, 78, 216) */
--primary-blue-light: #3B82F6; /* rgb(59, 130, 246) */

/* Primary Blue Variants */
--blue-50: #EFF6FF;   /* Light backgrounds */
--blue-100: #DBEAFE;  /* Status badges background */
--blue-600: #2563EB;  /* Default buttons */
--blue-700: #1D4ED8;  /* Hover states */
--blue-900: #1E3A8A;  /* Dark text on light backgrounds */
```

### Semantic Colors
```css
/* Success - Positive outcomes, clients, growth */
--success: #10B981;        /* rgb(16, 185, 129) */
--success-light: #D1FAE5;  /* rgb(209, 250, 229) */
--success-dark: #047857;   /* rgb(4, 120, 87) */

/* Danger - Negative outcomes, churned, declined */
--danger: #EF4444;         /* rgb(239, 68, 68) */
--danger-light: #FEE2E2;   /* rgb(254, 226, 226) */
--danger-dark: #DC2626;    /* rgb(220, 38, 38) */

/* Warning - Attention needed, opportunities, leads */
--warning: #F59E0B;        /* rgb(245, 158, 11) */
--warning-light: #FEF3C7;  /* rgb(254, 243, 199) */
--warning-dark: #D97706;   /* rgb(217, 119, 6) */

/* Info - Prospects, neutral states */
--info: #6B7280;           /* rgb(107, 114, 128) */
--info-light: #F3F4F6;     /* rgb(243, 244, 246) */
--info-dark: #374151;      /* rgb(55, 65, 81) */
```

### Neutral Palette
```css
/* Grays - Backgrounds, borders, text */
--gray-50: #F9FAFB;   /* Page backgrounds */
--gray-100: #F3F4F6;  /* Card backgrounds */
--gray-200: #E5E7EB;  /* Borders, dividers */
--gray-300: #D1D5DB;  /* Input borders */
--gray-400: #9CA3AF;  /* Placeholder text */
--gray-500: #6B7280;  /* Secondary text */
--gray-600: #4B5563;  /* Primary text */
--gray-700: #374151;  /* Headings */
--gray-800: #1F2937;  /* Dark headings */
--gray-900: #111827;  /* Emphasis text */

/* White */
--white: #FFFFFF;
```

## 📝 Typography

### Font Family
**Primary Font**: `Inter` - Modern, readable sans-serif
**Fallback**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Type Scale & Hierarchy
```css
/* Page Headers */
.text-3xl { font-size: 1.875rem; font-weight: 700; } /* 30px - Page titles */
.text-2xl { font-size: 1.5rem; font-weight: 600; }   /* 24px - Section headers */
.text-xl { font-size: 1.25rem; font-weight: 600; }   /* 20px - Card titles */

/* Metric Numbers (Statistics) */
.text-2xl-bold { font-size: 1.5rem; font-weight: 700; } /* Large metrics */
.text-xl-bold { font-size: 1.25rem; font-weight: 700; } /* Medium metrics */

/* Body Text */
.text-base { font-size: 1rem; font-weight: 400; }     /* 16px - Regular text */
.text-sm { font-size: 0.875rem; font-weight: 400; }   /* 14px - Table text */
.text-xs { font-size: 0.75rem; font-weight: 500; }    /* 12px - Labels, tags */

/* Labels & Helper Text */
.text-xs-caps { 
  font-size: 0.75rem; 
  font-weight: 500; 
  text-transform: uppercase; 
  letter-spacing: 0.05em; 
} /* Metric labels */

.text-xs-light { font-size: 0.75rem; font-weight: 400; } /* Helper text */
```

### Text Colors
```css
.text-primary { color: var(--gray-900); }    /* Main headings */
.text-secondary { color: var(--gray-600); }  /* Body text */
.text-muted { color: var(--gray-500); }      /* Secondary text */
.text-light { color: var(--gray-400); }      /* Helper text */
```

## 🧱 Component Styles

### Buttons
```css
/* Primary Button */
.btn-primary {
  background-color: var(--primary-blue);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.2s;
}
.btn-primary:hover {
  background-color: var(--primary-blue-hover);
}

/* Secondary Button */
.btn-secondary {
  background-color: transparent;
  color: var(--primary-blue);
  border: 1px solid var(--primary-blue);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-secondary:hover {
  background-color: var(--blue-50);
}

/* Tertiary/Text Button */
.btn-text {
  background-color: transparent;
  color: var(--primary-blue);
  padding: 0.25rem 0.5rem;
  font-weight: 500;
  transition: color 0.2s;
}
.btn-text:hover {
  color: var(--primary-blue-hover);
}
```

### Status Badges/Pills
```css
.badge-base {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

/* Status-specific badges */
.badge-prospect { 
  background-color: var(--blue-100); 
  color: var(--blue-800); 
}
.badge-lead { 
  background-color: var(--warning-light); 
  color: var(--warning-dark); 
}
.badge-opportunity { 
  background-color: #F3E8FF; 
  color: #7C3AED; 
}
.badge-client { 
  background-color: var(--success-light); 
  color: var(--success-dark); 
}
.badge-churned { 
  background-color: var(--danger-light); 
  color: var(--danger-dark); 
}
.badge-declined { 
  background-color: var(--danger-light); 
  color: var(--danger-dark); 
}
.badge-unqualified { 
  background-color: var(--info-light); 
  color: var(--info-dark); 
}
```

### Sentiment Indicators
Visual indicators for user sentiment using consistent lucide-react icons:

```css
/* Sentiment Icon Styling */
.sentiment-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.sentiment-good { color: var(--success); }     /* Green - CheckCircle */
.sentiment-neutral { color: var(--warning); }  /* Yellow - AlertCircle */
.sentiment-bad { color: var(--danger); }       /* Red - XCircle */
```

**Icon Mapping:**
- **Good Sentiment**: `CheckCircle` icon with green color (`text-green-600`)
- **Neutral Sentiment**: `AlertCircle` icon with yellow color (`text-yellow-600`)  
- **Bad Sentiment**: `XCircle` icon with red color (`text-red-600`)

**Usage Pattern**: Place sentiment icons before primary text/names in tables or lists to provide immediate visual context.

### Cards
```css
.card {
  background-color: var(--white);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid var(--gray-200);
  transition: all 0.2s;
}

.card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-color: var(--gray-300);
}

/* Metric Cards - Standard */
.metric-card {
  padding: 1.5rem;
  text-align: center;
}

/* Interactive Filter Cards */
.filter-card {
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.filter-card:hover {
  background-color: var(--semantic-light-bg);
  border-bottom-color: var(--semantic-color);
}

.filter-card.active {
  background-color: var(--semantic-light-bg);
  border-bottom-color: var(--semantic-color);
}

/* Status-specific filter cards */
.filter-card.churned { --semantic-color: var(--danger); --semantic-light-bg: var(--danger-light); }
.filter-card.declined { --semantic-color: var(--danger); --semantic-light-bg: var(--danger-light); }
.filter-card.unqualified { --semantic-color: var(--info); --semantic-light-bg: var(--info-light); }
.filter-card.prospect { --semantic-color: var(--primary-blue); --semantic-light-bg: var(--blue-50); }
.filter-card.lead { --semantic-color: var(--warning); --semantic-light-bg: var(--warning-light); }
.filter-card.opportunity { --semantic-color: #7C3AED; --semantic-light-bg: #F3E8FF; }
.filter-card.client { --semantic-color: var(--success); --semantic-light-bg: var(--success-light); }

/* Data Cards */
.data-card {
  padding: 1.5rem;
  overflow: hidden;
}
```

### Form Elements
```css
/* Input Fields */
.input-base {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--gray-300);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.input-base:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-base::placeholder {
  color: var(--gray-400);
}

/* Select Dropdowns */
.select-base {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--gray-300);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: var(--white);
  transition: all 0.2s;
}

.select-base:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

### Tables
```css
.table-container {
  background-color: var(--white);
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.table-header {
  background-color: var(--gray-50);
  padding: 0.75rem 1.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-500);
}

.table-cell {
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  border-bottom: 1px solid var(--gray-200);
}

.table-row:hover {
  background-color: var(--gray-50);
}
```

### Navigation
```css
.nav-container {
  background-color: var(--white);
  border-bottom: 1px solid var(--gray-200);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.nav-item {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-500);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.nav-item:hover {
  color: var(--gray-700);
  border-bottom-color: var(--gray-300);
}

.nav-item.active {
  color: var(--gray-900);
  border-bottom-color: var(--primary-blue);
}
```

## 📏 Spacing & Layout

### Grid System (8-point grid)
All spacing should use multiples of 8px (0.5rem) for consistency:

```css
/* Spacing Scale */
.space-1 { margin/padding: 0.25rem; }  /* 4px */
.space-2 { margin/padding: 0.5rem; }   /* 8px */
.space-3 { margin/padding: 0.75rem; }  /* 12px */
.space-4 { margin/padding: 1rem; }     /* 16px */
.space-6 { margin/padding: 1.5rem; }   /* 24px */
.space-8 { margin/padding: 2rem; }     /* 32px */
.space-12 { margin/padding: 3rem; }    /* 48px */
.space-16 { margin/padding: 4rem; }    /* 64px */
```

### Component Spacing Guidelines
- **Card padding**: 1.5rem (24px)
- **Button padding**: 0.5rem 1rem (8px 16px)
- **Input padding**: 0.5rem 0.75rem (8px 12px)
- **Section margins**: 2rem - 3rem (32px - 48px)
- **Element gaps**: 1rem (16px) for related items, 1.5rem (24px) for sections

### Container Widths
```css
.container-full { max-width: 100%; }           /* Full width pages */
.container-7xl { max-width: 80rem; }           /* 1280px - Large dashboards */
.container-6xl { max-width: 72rem; }           /* 1152px - Standard pages */
.container-4xl { max-width: 56rem; }           /* 896px - Forms, narrow content */
```

## 🎯 Interactive Patterns

### Filter Cards
Interactive cards that act as both display and filter controls:

**Pattern**: Statistics cards that users can click to filter data
**Visual States**:
- **Default**: White background, subtle border, semantic bottom border on hover
- **Active**: Semantic background color, semantic bottom border
- **Hover**: Light semantic background, semantic bottom border

**Implementation**:
```jsx
<div 
  onClick={() => handleFilter(item.value)}
  className={`filter-card ${isActive ? 'active' : ''} ${item.status}`}
>
  <div className="text-xl font-bold text-gray-900">{item.count}</div>
  <div className="text-xs font-medium text-gray-500 uppercase">{item.label}</div>
</div>
```

### Reset Controls
Always provide a way to clear filters:
- **Button Style**: Secondary button styling
- **Placement**: Near filter controls
- **Label**: "Reset" or "Clear Filters"

## 🎯 Usage Guidelines

### Do's ✅
- Use the defined color palette consistently
- Maintain the 8-point spacing grid
- Apply hover states to interactive elements
- Use semantic colors for status indicators
- Ensure sufficient color contrast (4.5:1 minimum)
- Test components at different screen sizes
- **Make data cards interactive when they can filter or drill down**
- **Provide reset functionality for any filtering system**
- **Use consistent bottom borders for visual hierarchy**

### Don'ts ❌
- Don't use custom colors outside the palette
- Don't mix different button styles in the same context
- Don't use pure black (#000000) for text
- Don't forget focus states for accessibility
- Don't use inconsistent spacing values
- **Don't make cards clickable without clear visual feedback**
- **Don't implement filters without a reset mechanism**

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
.mobile { min-width: 0; }        /* 0px+ */
.sm { min-width: 640px; }        /* Small tablets */
.md { min-width: 768px; }        /* Tablets */
.lg { min-width: 1024px; }       /* Desktop */
.xl { min-width: 1280px; }       /* Large desktop */
.2xl { min-width: 1536px; }      /* Extra large */
```

### Component Adaptations
- **Statistics cards**: Stack vertically on mobile, grid layout on desktop
- **Tables**: Horizontal scroll on mobile, full width on desktop
- **Navigation**: Collapse to hamburger menu on mobile
- **Forms**: Single column on mobile, multi-column on desktop

## 🔍 Accessibility

### Color Contrast
- Normal text: 4.5:1 minimum ratio
- Large text: 3:1 minimum ratio
- UI components: 3:1 minimum ratio

### Focus States
All interactive elements must have visible focus indicators:
```css
.focus-visible {
  outline: 2px solid var(--primary-blue);
  outline-offset: 2px;
}
```

### Screen Reader Support
- Use semantic HTML elements
- Provide alt text for images
- Use ARIA labels where needed
- Ensure logical tab order

## 🚀 Implementation Examples

### Metric Card Component
```jsx
<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
  <div className="text-2xl font-bold text-blue-600">585</div>
  <div className="text-xs font-medium text-gray-500 uppercase">Prospects</div>
  <div className="text-xs text-gray-400">+100% 28d</div>
</div>
```

### Interactive Filter Card Component
```jsx
<div 
  onClick={() => handleStatusFilter('prospect')}
  className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-b-2 cursor-pointer transition-all duration-200 ${
    isActive 
      ? 'bg-blue-50 border-b-blue-400' 
      : 'hover:bg-blue-50 border-b-blue-400'
  }`}
>
  <div className="text-xl font-bold text-gray-900">585</div>
  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prospects</div>
  <div className="text-xs text-gray-400">+100% 28d</div>
</div>
```

### Filter Reset Button
```jsx
<button
  onClick={resetFilters}
  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
>
  Reset
</button>
```

### Sentiment Icon Implementation
```jsx
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

const getSentimentIcon = (sentiment: string) => {
  const sentimentLower = sentiment?.toLowerCase() || 'neutral'
  
  switch (sentimentLower) {
    case 'good':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'bad':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'neutral':
    default:
      return <AlertCircle className="h-4 w-4 text-yellow-600" />
  }
}

// Usage in table/list
<div className="flex items-center">
  <div className="mr-3 flex-shrink-0">
    {getSentimentIcon(contact.sentiment)}
  </div>
  <div>
    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
  </div>
</div>
```

### Status Badge Component
```jsx
<span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
  PROSPECT
</span>
```

### Primary Button Component
```jsx
<button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
  Add New Contact
</button>
```

---

## 📋 Quick Reference

### Primary Colors
- Blue: `#2563EB` - Actions, navigation
- Green: `#10B981` - Success, clients
- Red: `#EF4444` - Danger, errors
- Yellow: `#F59E0B` - Warning, leads
- Purple: `#7C3AED` - Opportunities

### Typography
- Headers: `font-weight: 600-700`
- Body: `font-weight: 400`
- Labels: `font-weight: 500, text-transform: uppercase`

### Spacing
- Use multiples of 8px (0.5rem)
- Card padding: 24px
- Section margins: 32-48px

This design system ensures consistency, professionalism, and scalability across the entire DaVeenci Admin Dashboard. Reference this guide for all design decisions and component implementations. 