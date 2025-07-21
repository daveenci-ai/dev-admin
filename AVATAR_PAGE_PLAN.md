# Avatar Page Plan

## Objective
Create a full-screen, professional Avatar generation interface similar to the CRM table layout, with improved defaults and better UX.

## Layout Structure

### 1. Remove Header Content
- ❌ Remove "Avatar Generator" title
- ❌ Remove "AI-powered avatar generation with GitHub integration" subtitle
- ✅ Clean, minimal header-less design

### 2. Full-Screen Layout (CRM-style)
- ✅ Two-column layout: Control Panel + Gallery
- ✅ Control panel: Left side (fixed width ~400px)
- ✅ Gallery: Right side (flexible width, full remaining space)
- ✅ No margins/padding around main content
- ✅ Full viewport height utilization

### 3. Control Panel Improvements
- ✅ Avatar selection at top
- ✅ Advanced settings with improved defaults
- ✅ Generate button prominently placed
- ✅ Compact, professional styling

### 4. Gallery Improvements
- ✅ Full-width gallery grid
- ✅ Filter controls (collapsed by default)
- ✅ Search functionality
- ✅ Status filtering
- ✅ Clean card design

## Default Values Update

### Generation Settings
- **LoRA Scale**: 1.0 (was 0.8)
- **Guidance Scale**: 2.0 (was 7.5)
- **Number of Images**: 4 (new)
- **Inference Steps**: 36 (was 20)
- **Aspect Ratio**: Portrait (9:16) (new)
- **Output Format**: JPEG (new)

### UI State
- **Filter Panel**: Collapsed by default
- **Search**: Empty by default
- **Status Filter**: "All Status" selected

## Implementation Tasks

### Phase 1: Layout Restructure
1. Remove page title/subtitle
2. Implement full-screen two-column layout
3. Adjust control panel styling
4. Expand gallery to full width

### Phase 2: Settings Update
1. Update default values in AvatarGenerationForm
2. Add new settings fields (Number of Images, Aspect Ratio, Output Format)
3. Ensure API handles new parameters

### Phase 3: Gallery Improvements
1. Collapse filter panel by default
2. Improve responsive grid layout
3. Optimize card styling for full-width display

### Phase 4: Polish
1. Ensure consistent spacing
2. Test responsive behavior
3. Verify all functionality works

## Files to Modify

1. `src/app/avatar/page.tsx` - Main layout restructure
2. `src/components/avatar/AvatarGenerationForm.tsx` - Settings defaults
3. `src/components/avatar/AvatarGallery.tsx` - Gallery improvements
4. `src/app/api/avatar/generate/route.ts` - Handle new parameters

## Success Criteria

- ✅ No page title/subtitle
- ✅ Full-screen utilization like CRM
- ✅ Improved default settings
- ✅ Collapsed filters by default
- ✅ Professional, clean design
- ✅ Maintains all existing functionality 