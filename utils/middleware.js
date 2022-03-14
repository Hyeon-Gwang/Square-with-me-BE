const jwt = require("jsonwebtoken");

// models
const { User, Badge } = require("../models");

module.exports = {
  auth: async (req, res, next) => {
    const { authorization } = req.headers;
    if(!authorization) {
      return res.status(400).json({
        isSuccess: false,
        msg: "토큰 정보가 없습니다.",
      });
    };
    
    const [type, value] = authorization.split(" ");
    if(type !== "Bearer") {
      return res.status(400).json({
        isSuccess: false,
        msg: "유효하지 않은 타입의 토큰입니다.",
      });
    };

    if(!value) {
      return res.status(400).json({
        isSuccess: false,
        msg: "토큰이 없습니다.",
      });
    };

    try {
      const { origin } = jwt.verify(value, process.env.JWT_SECRET_KEY);

      const user = await User.findOne({
        where: { origin },
        attributes: ["id", "origin", "nickname", "profileImg", "statusMsg"],
        include: [{
          model: Badge,
          as: "MasterBadge",
          attributes: ["id", "name"],
        }],
      })
      if(!user) {
        return res.status(400).json({
          isSuccess: false,
          msg: "유효한 값의 토큰이 아닙니다."
        });
      };

      res.locals.user = user;
      next();
    } catch(error) {
      console.error(error);
      return res.status(500).json({
        isSuccess: false,
        msg: "Internal Server Error",
      });
    };
  },
};