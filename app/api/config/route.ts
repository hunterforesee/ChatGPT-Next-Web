import { NextRequest, NextResponse } from "next/server";

import { getServerSideConfig } from "../../config/server";
import { WechatCpAuthManager } from "./wechat/wechat.auth";
import { GOA_TOKEN_NAME } from "@/app/constant";

const serverConfig = getServerSideConfig();

// Danger! Do not hard code any secret value here!
// 警告！不要在这里写入任何敏感信息！
const DANGER_CONFIG = {
  needCode: serverConfig.needCode,
  hideUserApiKey: serverConfig.hideUserApiKey,
  disableGPT4: serverConfig.disableGPT4,
  hideBalanceQuery: serverConfig.hideBalanceQuery,
  disableFastLink: serverConfig.disableFastLink,
  customModels: serverConfig.customModels,
  goaToken: "",
  userInfo: {},
};

declare global {
  type DangerConfig = typeof DANGER_CONFIG;
}

const tokenMap: Map<string, object> = new Map<string, object>();

async function handle(req: NextRequest) {
  DANGER_CONFIG.goaToken = "";
  DANGER_CONFIG.userInfo = {};
  const code = req.headers.get("code");
  const goaToken = req.headers.get(GOA_TOKEN_NAME);
  if (serverConfig.wechatAuth) {
    //如果有code,先验证code
    if (code !== undefined && !!code) {
      // const userId = await WechatCpAuthManager.fetchUserId(code as string);
      const userId = "0d741b2335161fba0918e9d3d97d58f9";
      const userInfo = await WechatCpAuthManager.fetchUser(userId);
      if (!userId || !userInfo.userid) {
        return NextResponse.json(DANGER_CONFIG);
      } else {
        DANGER_CONFIG.goaToken =
          await WechatCpAuthManager.generateGoaToken(userInfo);
        DANGER_CONFIG.userInfo = userInfo;
        tokenMap.set(DANGER_CONFIG.goaToken, userInfo);
      }
    }
    //如果有token
    else if (
      goaToken !== undefined &&
      goaToken !== "" &&
      tokenMap.get(goaToken as string) !== undefined
    ) {
      const payload = await WechatCpAuthManager.verifyGoaToken(req, true);
      if (payload !== null) {
        DANGER_CONFIG.goaToken = goaToken as string;
        DANGER_CONFIG.userInfo = tokenMap.get(goaToken as string) as object;
        return NextResponse.json(DANGER_CONFIG);
      }
    }
  }

  return NextResponse.json(DANGER_CONFIG);
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
