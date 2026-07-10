cmake_minimum_required(VERSION 4.0)

find_package(cmake-bare REQUIRED PATHS node_modules/cmake-bare)
find_package(cmake-fetch REQUIRED PATHS node_modules/cmake-fetch)

project(bare_zlib C)

fetch_package("github:madler/zlib@1.3.2")

add_bare_module(bare_zlib)

target_sources(
  ${bare_zlib}
  PRIVATE
    binding.c
)

target_link_libraries(
  ${bare_zlib}
  PUBLIC
    zlibstatic
)
