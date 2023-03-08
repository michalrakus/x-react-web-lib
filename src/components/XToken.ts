// 1. posiela sa na server pri prihlaseni cez login fomrular
// 2. uklada sa do sessionStorage/localStorage po uspesnom prihlaseni, pouziva sa pri http basic autentifikacii pri kazdom http requeste
export interface XToken {
    username?: string; // pouziva sa pri starej autentifikacii - TODO - zrusit
    password?: string; // pouziva sa pri starej autentifikacii - TODO - zrusit
    accessToken?: string; // pouziva sa pri Auth0 autentifikacii
    xUser?: any; // XUser - aktualny user, nastavuje sa po logine, pouziva sa napr. na nastavenie atributu vytvoril/modifikoval
}
