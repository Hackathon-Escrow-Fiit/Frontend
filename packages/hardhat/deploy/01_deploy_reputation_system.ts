import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("ReputationSystem", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });

  console.log("✅ ReputationSystem deployed");
};

export default deploy;
deploy.tags = ["ReputationSystem"];
