// Wrapper around Google Identity Services (GIS), Google's current sign-in
// library: https://developers.google.com/identity/gsi/web
// Loads the gsi/client script on demand, then exposes One Tap (FedCM-based)
// automatic sign-in and the personalized "Sign in with Google" button.

const GSI_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleCredentialResponse {
	/** Google-issued ID token (JWT) for the signed-in user. */
	credential: string;
	select_by: string;
}

export interface PromptMomentNotification {
	isNotDisplayed(): boolean;
	isSkippedMoment(): boolean;
	isDismissedMoment(): boolean;
	getNotDisplayedReason(): string | undefined;
	getSkippedReason(): string | undefined;
	getDismissedReason(): string | undefined;
}

interface GoogleIdApi {
	initialize(config: Record<string, unknown>): void;
	prompt(listener?: (notification: PromptMomentNotification) => void): void;
	renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
	disableAutoSelect(): void;
}

declare global {
	interface Window {
		google?: { accounts: { id: GoogleIdApi } };
	}
}

let gsiPromise: Promise<GoogleIdApi> | null = null;

function loadGoogleId(): Promise<GoogleIdApi> {
	gsiPromise ??= new Promise((resolve, reject) => {
		const existing = window.google?.accounts?.id;
		if (existing) return resolve(existing);

		const script = document.createElement('script');
		script.src = GSI_SRC;
		script.async = true;
		script.onload = () => {
			const id = window.google?.accounts?.id;
			if (id) resolve(id);
			else reject(new Error('Google Identity Services loaded but accounts.id is unavailable'));
		};
		script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
		document.head.appendChild(script);
	});
	return gsiPromise;
}

export interface GoogleSignInOptions {
	clientId: string;
	/** Called with the credential (ID token) once the user signs in. */
	onCredential: (response: GoogleCredentialResponse) => void;
	/** Element to render the "Sign in with Google" button into. */
	buttonTarget?: HTMLElement;
	/** Show the One Tap prompt, signing returning users in automatically. */
	autoPrompt?: boolean;
}

export async function initGoogleSignIn(options: GoogleSignInOptions): Promise<void> {
	const id = await loadGoogleId();

	id.initialize({
		client_id: options.clientId,
		callback: options.onCredential,
		// Automatically sign in returning users with a single Google session.
		auto_select: true,
		// FedCM is Google's current protocol for One Tap prompts.
		use_fedcm_for_prompt: true,
		itp_support: true
	});

	if (options.buttonTarget) {
		id.renderButton(options.buttonTarget, {
			type: 'standard',
			theme: 'outline',
			size: 'large',
			text: 'signin_with',
			shape: 'pill'
		});
	}

	if (options.autoPrompt) {
		id.prompt((notification) => {
			// Surface why One Tap did not appear (browser cooldown after a
			// dismissal, no Google session, FedCM permission blocked, ...)
			if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
				console.info(
					'[google-signin] One Tap prompt not shown:',
					notification.getNotDisplayedReason() ?? notification.getSkippedReason() ?? 'unknown reason'
				);
			} else if (notification.isDismissedMoment()) {
				console.info('[google-signin] One Tap dismissed:', notification.getDismissedReason());
			}
		});
	}
}

/** Prevent One Tap auto sign-in after an explicit sign-out. */
export async function disableGoogleAutoSelect(): Promise<void> {
	const id = await loadGoogleId();
	id.disableAutoSelect();
}
