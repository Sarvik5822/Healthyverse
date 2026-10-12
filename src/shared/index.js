/**
 * Shared Components - Barrel Export
 * Usage: import { Button, Card, LoadingSpinner } from '../../shared';
 *
 * This is the NEW canonical import path after feature-based restructure.
 */

// ─── UI Components ──────────────────────────────────────────────────────────
export { default as Button } from './ui/Button';
export { default as Card } from './ui/Card';
export { default as Input } from './ui/Input';
export { default as Modal } from './ui/Modal';
export { default as Badge } from './ui/Badge';
export { default as DatePickerButton } from './ui/DatePickerButton';

// ─── Feedback Components ────────────────────────────────────────────────────
export { default as LoadingSpinner } from './feedback/LoadingSpinner';
export { default as ErrorMessage } from './feedback/ErrorMessage';
export { default as EmptyState } from './feedback/EmptyState';
export { default as SkeletonLoader, DashboardSkeleton, TrackerSkeleton } from './feedback/SkeletonLoader';
export { default as ErrorBoundary } from './feedback/ErrorBoundary';
export { default as FeatureErrorBoundary } from './feedback/FeatureErrorBoundary';
export { default as ScreenErrorBoundary } from './feedback/ScreenErrorBoundary';

// ─── Media Components ───────────────────────────────────────────────────────
export { default as Avatar } from './media/Avatar';
export { default as CachedAvatar } from './media/CachedAvatar';
export { default as CachedImage, preloadImages, clearImageCache } from './media/CachedImage';

// ─── Layout Components ──────────────────────────────────────────────────────
export { default as CircularProgress, SmallCircularProgress, ArcProgress } from './layout/CircularProgress';
export { default as SwipeableRow } from './layout/SwipeableRow';
export { default as UnitSelector } from './layout/UnitSelector';
export { default as GoalCard } from './layout/GoalCard';
export { default as MacroCard } from './layout/MacroCard';
export { default as ActivityItem } from './layout/ActivityItem';
export { default as PasswordStrengthIndicator } from './layout/PasswordStrengthIndicator';