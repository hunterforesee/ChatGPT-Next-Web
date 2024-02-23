import { NextRequest } from "next/server";
//import jwt from "jsonwebtoken";
import { jwtVerify, SignJWT } from "jose";
import { GOA_TOKEN_NAME } from "@/app/constant";

export const WechatCpAuthManager = {
  wechatCorpId: process.env.WECHAT_CORP_ID,
  wechatCorpSecret: process.env.WECHAT_CORP_SECRET,
  wechatAgentId: process.env.WECHAT_AGENT_ID,
  secretKey: process.env.JWT_SECRET_KEY,

  accessToken: "",
  expireTime: new Date(),

  //用于存储不同用户的token，用于后期进行比对
  tokenMap: Map<string, object>,

  accessTokenUrl() {
    return `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.wechatCorpId}&corpsecret=${this.wechatCorpSecret}`;
  },

  userInfoUrl(accessToken: string, code: string) {
    return `https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${accessToken}&code=${code}`;
  },

  async getValidAccessToken() {
    if (!this.isValidAccessToken()) {
      await this.fetchNewAccessToken();
    }

    return this.accessToken;
  },

  isValidAccessToken() {
    return this.accessToken && this.expireTime > new Date();
  },

  fetchUser(userId: string) {
    return this.getValidAccessToken().then((accessToken) => {
      console.log(`access token: ${accessToken}`);
      return fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userId}`,
      )
        .then((res) => res.json())
        .then((res) => {
          if (res.errcode) {
            return { userid: "", name: "", avatar: "" };
          }
          return {
            userid: res.userid,
            name: res.name,
            avatar: res.thumb_avatar,
          };
        });
    });
  },

  async fetchUserId(code: string) {
    const accessToken = await this.getValidAccessToken();
    return await fetch(this.userInfoUrl(accessToken, code))
      .then((res) => res.json())
      .then((res) => {
        if (res.errcode) {
          console.log(res);
          throw new Error(res.errmsg);
        }
        return res.UserId;
      });
  },

  fetchNewAccessToken() {
    return fetch(this.accessTokenUrl())
      .then((res) => res.json())
      .then((res) => {
        if (res.errcode) {
          throw new Error(res.errmsg);
        }
        this.accessToken = res.access_token;
        this.expireTime = new Date(
          new Date().getTime() + res.expires_in * 1000,
        );
      });
  },

  generateGoaToken(userInfo: any) {
    const secret = new TextEncoder().encode(this.secretKey);
    const token = new SignJWT({ ...userInfo })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .setAudience("http://www.goa.com.cn")
      .setIssuer("http://www.goa.com.cn")
      .setSubject("http://www.goa.com.cn")
      .sign(secret);
    console.log(token);
    return token;
  },

  async verifyGoaToken(req: NextRequest, isJwt: boolean) {
    try {
      const secret = new TextEncoder().encode(this.secretKey);
      const token = req.headers.get(GOA_TOKEN_NAME) as string;
      if (token == null) return null;
      return jwtVerify(token, secret);
    } catch (error) {
      if (isJwt) {
        return null;
      }
    }

    return null;
  },
};
