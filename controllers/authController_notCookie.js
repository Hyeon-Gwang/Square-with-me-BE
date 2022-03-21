const passport = require("passport");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// utils
const {
  regex,
  asyncWrapper,
  createStatusMsg,
  createAnonOrigin,
} = require("../utils/util");

// models
const {
  User,
  Badge,
  WeekRecord,
  MonthRecord,
  BeautyRecord,
  SportsRecord,
  StudyRecord,
  CounselingRecord,
  CultureRecord,
  ETCRecord,
} = require("../models");

module.exports = {
  create: {
    local: asyncWrapper(async (req, res) => {
      const { origin, nickname, pwd } = req.body;

      if (!regex.checkEmail(origin)) {
        return res.status(400).json({
          isSuccess: false,
          msg: "이메일 형식이 올바르지 않습니다.",
        });
      }

      if (nickname.length < 2 || nickname.length > 8) {
        return res.status(400).json({
          isSuccess: false,
          msg: "닉네임은 2글자 ~ 8글자로 적어주세요.",
        });
      }

      if (!regex.checkNickname(nickname)) {
        return res.status(400).json({
          isSuccess: false,
          msg: "닉네임에 특수문자를 사용할 수 없습니다.",
        });
      }

      if (pwd.length < 8 || pwd.length > 16) {
        return res.status(400).json({
          isSuccess: false,
          msg: "비밀번호가 올바르지 않습니다.",
        });
      }

      const isExistOrigin = await User.findOne({
        where: { origin },
      });
      if (isExistOrigin) {
        return res.status(400).json({
          isSuccess: false,
          msg: "이미 존재하는 이메일입니다.",
        });
      }

      const isExistNickname = await User.findOne({
        where: { nickname: nickname },
      });
      if (isExistNickname) {
        return res.status(400).json({
          isSuccess: false,
          msg: "이미 존재하는 닉네임입니다.",
        });
      }

      const hashedPwd = bcrypt.hashSync(pwd, 10);
      const user = await User.create({
        origin,
        nickname,
        pwd: hashedPwd,
        statusMsg: createStatusMsg(),
        type: "local",
      });

      // 회원가입 할 때 주/월 기록 테이블에 유저 레코드 추가
      await BeautyRecord.create({
        userId: user.id,
      });

      await SportsRecord.create({
        userId: user.id,
      });

      await StudyRecord.create({
        userId: user.id,
      });

      await CounselingRecord.create({
        userId: user.id,
      });

      await CultureRecord.create({
        userId: user.id,
      });

      await ETCRecord.create({
        userId: user.id,
      });

      await MonthRecord.bulkCreate([
        { userId: user.id, date: 1 },
        { userId: user.id, date: 2 },
        { userId: user.id, date: 3 },
        { userId: user.id, date: 4 },
        { userId: user.id, date: 5 },
        { userId: user.id, date: 6 },
        { userId: user.id, date: 7 },
        { userId: user.id, date: 8 },
        { userId: user.id, date: 9 },
        { userId: user.id, date: 10 },
        { userId: user.id, date: 11 },
        { userId: user.id, date: 12 },
        { userId: user.id, date: 13 },
        { userId: user.id, date: 14 },
        { userId: user.id, date: 15 },
        { userId: user.id, date: 16 },
        { userId: user.id, date: 17 },
        { userId: user.id, date: 18 },
        { userId: user.id, date: 19 },
        { userId: user.id, date: 20 },
        { userId: user.id, date: 21 },
        { userId: user.id, date: 22 },
        { userId: user.id, date: 23 },
        { userId: user.id, date: 24 },
        { userId: user.id, date: 25 },
        { userId: user.id, date: 26 },
        { userId: user.id, date: 27 },
        { userId: user.id, date: 28 },
        { userId: user.id, date: 29 },
        { userId: user.id, date: 30 },
        { userId: user.id, date: 31 },
      ]);

      return res.status(201).json({
        isSuccess: true,
        msg: "회원가입에 성공하였습니다.",
      });
    }),

    kakao: (req, res, next) => {
      passport.authenticate(
        "kakao",
        asyncWrapper(async (error, user) => {
          if (error) {
            return res.status(500).json({
              isSuccess: false,
              msg: "카카오 로그인 오류",
            });
          }

          const { origin } = user;
          const token = jwt.sign({ origin }, process.env.JWT_SECRET_KEY);

          // 회원가입 할 때 주/월 기록 테이블에 유저 레코드 추가
          await WeekRecord.create({
            userId: user.id,
          });

          for (let i = 1; i <= 31; i++) {
            await MonthRecord.create({
              userId: user.id,
              date: i,
              time: 0,
            });
          }

          // 카카오 로그인 유저 뱃지 기준 확인

          // *****ch: 로그인과 관련된 뱃지들 지급*****

          // 선착순 뱃지 지급 + 인원 100 명 까지만 추가해야함! -> badges테이블에 leftBadges 남은 갯수가 0이 되기 전까지 지급
          //선착순 뱃지 이름을 firstCome 이라고 가정, 실제로 DB에 badge 테이블에 name 넣어주어야 함
          const firstComeBadge = await Badge.findOne({
            where: {
              name: "firstCome",
            },
          });
          const isGivenBadge = await user.getMyBadges({
            where: {
              where: { id: firstComeBadge.id, },
            },
          }); // 특정 유저의 뱃지 리스트를 가져옴, user 모델에서 MyBadges로 정의된 상태

          // 100번째 까지 모두 지급되었는지 확인
          const leftBadge = firstComeBadge.leftBadges;

          // ch: 100번이라는 숫자와 비교하는 것으로 식을 짜면 mysql의 특성상 1 ~ 100번 사이의 유저가 탈퇴했다고해도 그 다음 번호의 사람에게 뱃지를 주지는 않는다.

          if (isGivenBadge.length === 0 && 0 < leftBadge) {
            await firstComeBadge.decrement("leftBadges");

            await user.addMyBadges(
              firstComeBadge.id // 특정 유저에게 선착순 뱃지가 없으므로 해당 유저의 아이디에 선착순 유저 뱃지 지급
            );

            res.status(200).json({
              isSuccess: true,
              data: {
                token,
                user,
                newBadge: firstComeBadge, // ch: 획득한 뱃지를 리턴해주어야 특정 유저의 뱃지 페이지를 업데이트 해줄 수 있음, S3로 전달하는 선착순 뱃지 이미지 링크도 들어있음
              },
            });
          } else {
            res.status(200).json({
              isSuccess: true,
              data: {
                token,
                user,
              },
            });
          }
        })
      )(req, res, next); // 미들웨어 확장
    },

    anon: asyncWrapper(async (req, res) => {
      const anonOrigin = createAnonOrigin();

      const anonUser = await User.create({
        origin: anonOrigin,
        nickname: "익명의 유저",
        pwd: "0",
        statusMsg: "익명의 유저입니다.",
        type: "anon",
      });

      const token = jwt.sign(
        { origin: anonOrigin },
        process.env.JWT_SECRET_KEY
      );

      return res.status(201).json({
        isSuccess: true,
        data: {
          user: anonUser,
          token,
        },
      });
    }),
  },

  get: {
    auth: asyncWrapper(async (req, res) => {
      const { origin, pwd } = req.body;

      if (!origin || !pwd) {
        return res.status(400).json({
          isSuccess: false,
          msg: "이메일 혹은 비밀번호를 입력하세요.",
        });
      }

      const user = await User.findOne({
        where: { origin },
      });
      if (!user) {
        return res.status(400).json({
          isSuccess: false,
          msg: "존재하지 않는 이메일입니다.",
        });
      }

      const pwdCheck = bcrypt.compareSync(pwd, user.pwd);
      if (!pwdCheck) {
        return res.status(400).json({
          isSuccess: false,
          msg: "비밀번호가 틀렸습니다.",
        });
      }

      const fullUser = await User.findOne({
        where: {
          origin,
          type: "local",
        },
        attributes: [
          "id",
          "origin",
          "nickname",
          "profileImg",
          "statusMsg",
          "type",
        ],
        include: [
          {
            model: Badge,
            as: "MasterBadge",
            attributes: ["id", "name", "imageUrl"],
          },
        ],
      });
      const token = jwt.sign({ origin }, process.env.JWT_SECRET_KEY);

      // *****ch: 로컬로그인과 관련된 뱃지들 지급*****

      // 선착순 뱃지 지급
      //선착순 뱃지 이름을 firstCome 이라고 가정, 실제로 DB에 badge 테이블에 name 넣어주어야 함
      const firstComeBadge = await Badge.findOne({
        where: {
          name: "firstCome",
        },
      });
      const isGivenBadge = await user.getMyBadges({
        where: { id: firstComeBadge.id, },
      })

      // 100번째 까지 모두 지급되었는지 확인
      const leftBadge = firstComeBadge.leftBadges;

      if (isGivenBadge.length === 0 && user.type === "local" && 0 < leftBadge) {
        // ch: 로컬로 로그인한 사람에게만 지급, 카카오는 위에 따로 구현되어 있음
        await user.addMyBadges(firstComeBadge.id);  // 특정 유저에게 선착순 뱃지가 없으므로 해당 유저의 아이디에 선착순 유저 뱃지 지급

        return res.status(200).json({
          isSuccess: true,
          data: {
            token,
            user: fullUser,
            newBadge: firstComeBadge, // ch: 획득한 뱃지를 리턴해주어야 특정 유저의 뱃지 페이지를 업데이트 해줄 수 있음
          },
        });
      } else {
        return res.status(200).json({
          isSuccess: true,
          data: {
            token,
            user: fullUser,
          },
        });
      }
    }),
  },

  delete: {
    auth: asyncWrapper(async (req, res) => {
      const { type } = req.params;
      const { id } = res.locals.user;

      switch (type) {
        case "local":
          break;
        case "kakao":
          break;
        case "anon":
          await User.destroy({
            where: { id },
          });
          break;
      }

      return res.status(200).json({
        isSuccess: true,
      });
    }),
  },
};
