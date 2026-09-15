from setuptools import find_packages, setup

setup(
    name="livingorg_bridge",
    version="1.0.0",
    description="Server-side operational bridge for LivingOrg OS on ERPNext/Frappe",
    author="Grupo Altoplano",
    packages=find_packages(),
    include_package_data=True,
    package_data={"livingorg_bridge": ["*.txt"]},
    zip_safe=False,
    license="UNLICENSED",
)
