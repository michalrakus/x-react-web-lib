// 1. posiela sa na server pri prihlaseni cez login fomrular
// 2. uklada sa do sessionStorage/localStorage po uspesnom prihlaseni, pouziva sa pri http basic autentifikacii pri kazdom http requeste
export interface XToken {
    username: string;
    password: string;
}
