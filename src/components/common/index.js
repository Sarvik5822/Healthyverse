/**
 * BACKWARD COMPATIBILITY LAYER
 *
 * After the feature-based restructure, all shared components live in src/shared/.
 * This file re-exports from the new locations so that any OLD import paths
 * like `../../components/common/Button` still resolve correctly.
 *
 * NEW canonical path: import { Button } from '../../shared';
 * OLD path (still works): import Button from '../../../shared/ui/Button';
 *
 * Individual file re-exports (for default import compatibility):
 */

// ─── UI ─────────────────────────────────────────────────────────────────────
export { default as ActivityItem } from '../../shared/layout/ActivityItem';
export { default as Avatar } from '../../shared/media/Avatar';
export { default as Badge } from '../../shared/ui/Badge';
export { default as Button } from '../../shared/ui/Button';
export { default as Card } from '../../shared/ui/Card';
export { default as CircularProgress, SmallCircularProgress, ArcProgress } from '../../shared/layout/CircularProgress';
export { default as DatePickerButton } from '../../shared/ui/DatePickerButton';
export { default as EmptyState } from '../../shared/feedback/EmptyState';
export { default as ErrorMessage } from '../../shared/feedback/ErrorMessage';
export { default as GoalCard } from '../../shared/layout/GoalCard';
export { default as Input } from '../../shared/ui/Input';
export { default as LoadingSpinner } from '../../shared/feedback/LoadingSpinner';
export { default as MacroCard } from '../../shared/layout/MacroCard';
export { default as Modal } from '../../shared/ui/Modal';
export { default as PasswordStrengthIndicator } from '../../shared/layout/PasswordStrengthIndicator';
export { default as SwipeableRow } from '../../shared/layout/SwipeableRow';
export { default as UnitSelector } from '../../shared/layout/UnitSelector';

// ─── Image Caching ──────────────────────────────────────────────────────────
export { default as CachedImage, preloadImages, clearImageCache } from '../../shared/media/CachedImage';
export { default as CachedAvatar } from '../../shared/media/CachedAvatar';

// ─── Error Boundaries ───────────────────────────────────────────────────────
export { default as FeatureErrorBoundary } from '../../shared/feedback/FeatureErrorBoundary';
export { default as ScreenErrorBoundary } from '../../shared/feedback/ScreenErrorBoundary';