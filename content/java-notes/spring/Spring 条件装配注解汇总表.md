### 📊 Spring 条件装配注解汇总表

| 类别                | 注解                                   | 作用                                                         | 核心属性                                                     | 典型场景                                                 |
| :------------------ | :------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------- |
| **Bean 条件**       | `@ConditionalOnBean`                   | 当容器中存在指定 **Bean** 时，配置生效。                     | `value`：按类型指定 Bean；<br>`name`：按名称指定 Bean；<br>`search`：搜索层级 | 已有某个 Bean 时才需要加载另一个依赖它的 Bean。          |
|                     | `@ConditionalOnMissingBean`            | 当容器中**不存在**指定 Bean 时，配置生效（**常用**）。       | 同上                                                         | 提供默认实现，并允许用户通过自定义同类型 Bean 进行覆盖。 |
|                     | `@ConditionalOnSingleCandidate`        | 当容器中指定类型的 Bean 有且只有一个，或存在多个但有明确 `@Primary` 候选者时生效。 | `value`：按类型指定 Bean                                     | 注入一个明确唯一的 Bean，避免因多个实现导致的歧义。      |
| **类路径条件**      | `@ConditionalOnClass`                  | 当类路径下**存在**指定类时，配置生效。                       | `value` / `name`：指定类全限定名                             | 检查某个依赖库是否已引入，以决定是否启用相关自动配置。   |
|                     | `@ConditionalOnMissingClass`           | 当类路径下**不存在**指定类时，配置生效。                     | `value` / `name`：指定类全限定名                             | 根据某个库的缺失与否，决定是否切换到备选方案。           |
| **配置属性条件**    | `@ConditionalOnProperty`               | 根据配置文件中指定属性的值来决定是否生效。                   | `name`：属性名；<br>`havingValue`：期望值；<br>`matchIfMissing`：属性不存在时是否匹配 | 实现功能开关或环境差异化配置。                           |
| **资源条件**        | `@ConditionalOnResource`               | 当类路径下存在指定的**资源文件**时，配置生效。               | `resources`：资源文件路径                                    | 检测配置文件（如 `logback.xml`）是否存在来决定日志配置。 |
| **Web 应用条件**    | `@ConditionalOnWebApplication`         | 当应用是 **Web 应用**时生效。                                | `type`：Web 应用类型（SERVLET/REACTIVE/ANY）                 | 仅在 Web 环境下注册 `DispatcherServlet` 等组件。         |
|                     | `@ConditionalOnNotWebApplication`      | 当应用**不是** Web 应用时生效。                              | 无                                                           | 在非 Web 环境（如批处理任务）下禁用某些配置。            |
|                     | `@ConditionalOnWarDeployment`          | 当应用是以**传统 WAR 包**形式部署时生效。                    | 无                                                           | 为传统部署方式提供特殊配置。                             |
|                     | `@ConditionalOnNotWarDeployment`       | 当应用**不是**以 WAR 包形式部署时生效。                      | 无                                                           | 为 Spring Boot 内嵌容器运行的 JAR 包方式提供配置。       |
| **表达式条件**      | `@ConditionalOnExpression`             | 当指定的 **SpEL 表达式**值为 `true` 时生效。                 | `value`：SpEL 表达式                                         | 实现需要多个配置项组合判断等复杂逻辑。                   |
| **云平台条件**      | `@ConditionalOnCloudPlatform`          | 当应用运行在**指定的云平台**上时生效。                       | `value`：`CloudPlatform` 枚举（如 CLOUD_FOUNDRY, KUBERNETES） | 为特定云平台（如 K8s）提供优化配置。                     |
| **Java 环境条件**   | `@ConditionalOnJava`                   | 根据 **Java 版本**决定是否生效。                             | `value`：比较的版本；<br>`range`：比较范围（相等或更新）     | 确保高版本 JDK 的特性不会在低版本上运行。                |
| **JNDI 条件**       | `@ConditionalOnJndi`                   | 当指定的 **JNDI 资源**存在时生效。                           | `value`：JNDI 资源路径                                       | 检测数据源是否以 JNDI 方式暴露，以决定是否使用。         |
| **Spring 功能条件** | `@Profile`                             | 当指定的**环境 Profile** 被激活时生效（Spring Framework 原生）。 | `value`：Profile 名称                                        | 实现多环境（开发、测试、生产）的差异化配置。             |
| **Actuator 专用**   | `@ConditionalOnEnabledHealthIndicator` | 当 Actuator 的某个 **健康指示器** 被启用时生效。             | `value`：HealthIndicator 名称                                | 根据配置决定是否启用某个自定义的健康检查组件。           |
|                     | `@ConditionalOnEnabledInfoContributor` | 当 Actuator 的某个 **信息贡献者** 被启用时生效。             | `value`：InfoContributor 名称                                | 根据配置决定是否向 `/actuator/info` 端点贡献信息。       |

> **提示**：除了上面表格里的这些，Spring Boot 还有一些内部专用注解，比如 `@ConditionalOnManagementPort`（用于 Actuator 管理端口）和 `@ConditionalOnEnabledResourceChain`（用于 Web 资源链优化），它们通常在特定场景下使用。

### 💡 补充说明

*   **元注解机制**：所有这些 `@ConditionalOnXxx` 注解，本质上都是由 Spring Boot 基于 Spring 框架底层的 `@Conditional` 元注解构建的快捷方式。
*   **自定义扩展**：如果内置注解都无法满足你的复杂判断逻辑，你可以实现 `Condition` 接口，并使用 `@Conditional(YourCustomCondition.class)` 来完全掌控 Bean 的加载时机。
