import useAppStore from '../store/useAppStore'
import { goTo } from './goTo'
import { loginUrl } from './loginUrl'

/**
 * Sign out and go to the home page. A full page load, so nothing from the
 * previous session (a private dataset, say) stays on screen. The backend marks
 * the browser as signed out, so the next sign-in asks which account to use.
 */
export async function signOut(): Promise<void> {
  await useAppStore.getState().logout()
  goTo(import.meta.env.BASE_URL)
}

/**
 * Sign out, then straight back in through the provider's account chooser,
 * returning to this page as whichever account is picked.
 */
export async function switchAccount(): Promise<void> {
  const next = loginUrl()
  await useAppStore.getState().logout()
  goTo(next)
}
