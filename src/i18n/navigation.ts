import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Type-safe navigation helpers (unprefixed — see routing.ts). */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
