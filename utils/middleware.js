const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// models
const { User, RefreshToken, Badge } = require("../models");
const { verifyToken } = require("./jwt");
const { asyncWrapper } = require("./util");
module.exports = {
  auth: asyncWrapper(async (req, res, next) => {
    const accessToken = verifyToken(req.cookies.accessToken);
    const refreshToken = verifyToken(req.cookies.refreshToken);
    const currentRefreshToken =  await RefreshToken.findOne({ //현재 가지고있는 리프레시토큰이
      where: {userId: refreshToken.id}
    });
    if(currentRefreshToken.expiryDate.getTime() > new Date().getTime() || !refreshToken){  //만료되면 DB에서 지움, 쿠키에 토큰이 없어도 지움
      RefreshToken.destroy({
        where: {userId: refreshToken.id}
      })
    }
    if (req.cookies.accessToken === undefined) {
      return res
        .status(400)
        .json({ isSuccess: false, msg: "API 사용 권한이 없습니다. 다시 로그인 해주세요." });
    }

    if (accessToken === null) {
      if (refreshToken === undefined) {
        //access,refresh 둘 다 만료
        return res.status(400).json({
          isSuccess: false,
          msg: "API 사용 권한이 없습니다. 다시 로그인 해주세요.",
        });
      } else {
        // access 만료, refresh 유효
        const user = await User.findOne({
          where: { id: refreshToken.id },
        });
        if (!user) {
          return res.status(400).json({ isSuccess: false, msg: "에러" });
        }
        const newAccessToken = jwt.sign(
          { origin: user.origin },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: '1h',
            issuer: "sw",
          }
        );
        res.cookie("accessToken", newAccessToken, {httpOnly: true});
        req.cookies.accessToken = newAccessToken;
        next();
      }
    } else {
      if (refreshToken === undefined) {
        // access 유효, refresh 만료
        const user = await User.findOne({
          where: { origin: accessToken.origin },
        });
        if (!user) {
          return res.status(400).json({ isSuccess: false, msg: "에러" });
        }
        const newRefreshToken = jwt.sign(
          { id: user.id },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: '1d',
            issuer: "sw",
          }
        );
        let expiredAt = new Date();
      expiredAt.setDate(
        expiredAt.getDate() + 1
      );
        await RefreshToken.create({
          token: newRefreshToken,
          userId: user.id,
          expiryDate: expiredAt.getTime(),
        });
        res.cookie("refreshToken", newRefreshToken, {httpOnly: true});
        req.cookies.refreshToken = newRefreshToken;
        next();
      } else {
        // access, refresh 둘 다 유효
        next();
      }
    }
    const user = await User.findOne({
      where: { origin:accessToken.origin},
      attributes: ["id", "origin", "nickname", "profileImg", "statusMsg"],
      include: [{
        model: Badge,
        as: "MasterBadge",
        attributes: ["id", "name"],
      }],
    })
    if (!user) {
      return res.status(400).json({ isSuccess: false, msg: "서버내부에러" });
    }
    res.locals.user = user;
    next();
  },
  )
};