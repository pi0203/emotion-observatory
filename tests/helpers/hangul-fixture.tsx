// A fixture for the Korean-in-code scanner: each kind it must catch appears once.
// 이 주석은 세지 않는다.
/* 이 블록 주석도 세지 않는다. */
export const literal = "문자열";
export const plain = `템플릿`;
export const template = (name: string) => `이름 ${name}`;
export const english = "only English here";
export const Fixture = () => <p>화면 글자</p>;
