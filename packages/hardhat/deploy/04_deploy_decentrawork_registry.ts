import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("DecentraWorkRegistry", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("✅ DecentraWorkRegistry deployed");
};

export default deploy;
deploy.tags = ["DecentraWorkRegistry"];
