import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "ethers";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const cap = parseEther("100000000"); // 100 million DWT

  await deploy("DecentraToken", {
    from: deployer,
    args: [deployer, deployer, cap],
    log: true,
    autoMine: true,
  });

  console.log("✅ DecentraToken deployed");
};

export default deploy;
deploy.tags = ["DecentraToken"];
