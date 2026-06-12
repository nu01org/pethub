// Client for the init service (/api/init), which provides the configuration
// the frontend needs to bootstrap itself.

export interface AuthProviderConfig {
	id: 'google';
	clientId: string;
}

export interface InitConfig {
	auth: {
		providers: AuthProviderConfig[];
	};
}

export async function fetchInitConfig(fetchFn: typeof fetch = fetch): Promise<InitConfig> {
	const response = await fetchFn('/api/init');
	if (!response.ok) {
		throw new Error(`Init service request failed with status ${response.status}`);
	}
	return response.json();
}
