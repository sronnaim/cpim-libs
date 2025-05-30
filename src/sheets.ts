// import path from "path";
import { google } from "googleapis";
import { GOOGLE_CLIENT_EMAIL, GOOGLE_CLIENT_ID, GOOGLE_PRIVATE_KEY, GOOGLE_PRIVATE_KEY_ID, GOOGLE_PROJECT_ID, GOOGLE_TOKEN_URI, GOOGLE_TYPE, GOOGLE_UNIVERSE_DOMAIN } from "@/constants";

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
];

// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');


/**
 * Load or request or authorization to call APIs.
 *
 */
export const authorize = async () => {
    const client = new google.auth.GoogleAuth({
        scopes: SCOPES,
        credentials: {
            project_id: GOOGLE_PROJECT_ID,
            private_key_id: GOOGLE_PRIVATE_KEY_ID,
            private_key: GOOGLE_PRIVATE_KEY,
            client_email: GOOGLE_CLIENT_EMAIL,
            client_id: GOOGLE_CLIENT_ID,
            type: GOOGLE_TYPE,
            token_url: GOOGLE_TOKEN_URI,
            universe_domain: GOOGLE_UNIVERSE_DOMAIN
        }
    });

    return client
}
  