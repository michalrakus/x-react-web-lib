// enum for environment variables in configuration file .env
export enum XEnvVar {
    REACT_APP_BACKEND_URL = 'REACT_APP_BACKEND_URL',
    REACT_APP_AUTH = 'REACT_APP_AUTH',

    REACT_APP_AUTH0_DOMAIN = 'REACT_APP_AUTH0_DOMAIN',
    REACT_APP_AUTH0_CLIENT_ID = 'REACT_APP_AUTH0_CLIENT_ID',
    REACT_APP_AUTH0_AUDIENCE = 'REACT_APP_AUTH0_AUDIENCE'
    //REACT_APP_AUTH0_SCOPE = 'REACT_APP_AUTH0_SCOPE'
}

// enum for values of the environment variable REACT_APP_AUTH
export enum XReactAppAuth {
    LOCAL = 'LOCAL',
    AUTH0 = 'AUTH0',
    AAD = 'AAD'
}
