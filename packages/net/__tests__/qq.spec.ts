import { splitCookiesString } from "set-cookie-parser";
import { expect, it } from "vitest";

it("Should fix qq wrong header", () => {
  const header =
    "_astraeus_session=Sp_QxpO%253D%253D--d;Domain=webvpn.nenu.edu.cn; Path=/;HttpOnly;SERVERID=Server1;Domain=webvpn.nenu.edu.cn;Path=/;route=9ff;Domain=authservernenu.edu.cn:Path=/;JSESSIONID=8R_nc!51;Domain=authserver.nenu.edu.cn; Path=/;HttpOnly;org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=zh_CN;Domain=authserver.nenu.edu.cn; Path=/;CASTGC=T-as;Domain=authserver.nenu.edu.cn; Path=/authserver/;Expires=Sun, 23 Jul 2023 15:26:12 GMT;HttpOnly;iPlanetDirectoryPro=AQ%2523;Domain=.nenu.edu.cn;Path=/; webvn_key=ev.b.cv";

  const result = header.replace(
    /;((?!Path|Expires|Max-Age|Domain|Path|SameSite)[^\s;]*?)=/gi,
    ", $1=",
  );

  expect(splitCookiesString(result)).toStrictEqual([
    "_astraeus_session=Sp_QxpO%253D%253D--d;Domain=webvpn.nenu.edu.cn; Path=/;HttpOnly",
    "SERVERID=Server1;Domain=webvpn.nenu.edu.cn;Path=/",
    "route=9ff;Domain=authservernenu.edu.cn:Path=/",
    "JSESSIONID=8R_nc!51;Domain=authserver.nenu.edu.cn; Path=/;HttpOnly",
    "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=zh_CN;Domain=authserver.nenu.edu.cn; Path=/",
    "CASTGC=T-as;Domain=authserver.nenu.edu.cn; Path=/authserver/;Expires=Sun, 23 Jul 2023 15:26:12 GMT;HttpOnly",
    "iPlanetDirectoryPro=AQ%2523;Domain=.nenu.edu.cn;Path=/; webvn_key=ev.b.cv",
  ]);
});
