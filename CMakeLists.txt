cmake_minimum_required(VERSION 3.25)

project(bare_zlib C)

include(bare)

set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(NOT TARGET zlib)
  set(ZLIB_BUILD_EXAMPLES OFF)

  add_subdirectory(vendor/zlib EXCLUDE_FROM_ALL)
endif()

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
