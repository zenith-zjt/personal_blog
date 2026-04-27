``` mermaid
classDiagram
class LotteryStrategy {
+String id (PK)
+String strategyName
+Date createTime
+Integer dataStatus
+Date lastUpdateTime
}

    class LotteryStrategyAwardConfig {
        +String id (PK)
        +String awardTitle
        +String awardSubtitle
        +Integer awardTotalCount
        +Integer awardRemainCount
        +Integer awardWeight
        +String strategyId (FK → LotteryStrategy.id)
        +String awardId (FK → LotteryAward.id)
        +Integer sort
        +Date createTime
        +Integer dataStatus
        +Date lastUpdateTime
    }

    class LotteryStrategyRuleLink {
        +String id (PK)
        +String ruleId (FK → LotteryStrategyRulePool.id)
        +Integer linkType  "1:关联策略 2:关联奖品配置"
        +String linkId     "FK → LotteryStrategy.id 或 LotteryStrategyAwardConfig.id"
        +Date createTime
        +Integer dataStatus
        +Date lastUpdateTime
    }

    class LotteryStrategyRulePool {
        +String id (PK)
        +String ruleDesc
        +String ruleValue
        +String ruleType
        +Integer awardType
        +String awardId (FK → LotteryAward.id)
        +Date createTime
        +Integer dataStatus
        +Date lastUpdateTime
    }

    %% 一对多：一个策略包含多个奖品配置
    LotteryStrategy "1" -- "*" LotteryStrategyAwardConfig : strategyId \<br>一对多

    %% 一对一：规则池与关联表
    LotteryStrategyRulePool "1" -- "1" LotteryStrategyRuleLink : ruleId<br>一对一

    %% 一对多：策略关联多个规则（通过 linkType=1）
    LotteryStrategy "1" -- "*" LotteryStrategyRuleLink : linkId (linkType=1)<br>一对多

    %% 一对多：奖品配置关联多个规则（通过 linkType=2）
    LotteryStrategyAwardConfig "1" -- "*" LotteryStrategyRuleLink : linkId (linkType=2)<br>一对多

    note for LotteryStrategyRuleLink "linkType 用于区分 linkId 指向的表：<br>- 1 → LotteryStrategy.id<br>- 2 → LotteryStrategyAwardConfig.id"
    note for LotteryStrategyAwardConfig "awardId 暂未关联具体表，预留字段"
    note for LotteryStrategyRulePool "awardId 可选，当 awardType=1 时关联 LotteryAward"
```