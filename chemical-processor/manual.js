let { chemicals, newChemical } = require('./chemicals.js')
let { linkify } = require('./helpers.js')

function link_gs(s) {
	return `<a href="https://www.osha.gov/laws-regs/regulations/standardnumber/${ s.slice(0, 4) }/${ s.replace(/\([a-z]\)/, '') }#${ s }">${s}</a>`
}

let manual = {
	// Z-2
	"Benzene": {
		"name_add": "(Z37.40-1969)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
	                            "values": {
	                                "ppm": "25"
	                            }
							},
							"max": {
								values: {
									ppm: 50
								},
								duration: "(10 min)"
							}
						}
					}
				},
			}
		},
		"z2": true
	},
	"Beryllium &amp; beryllium compounds (as Be)": {
		"name_add": "(Z37.29-1970)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
	                            "values": {
	                                "mgm3": "0.005"
	                            },
	                            duration: 30
							},
							max: {
								values: {
									mgm3: '0.025'
								},
								duration: '30 min'
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "mgm3": "0.0002"
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "mgm3": "0.002"
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "mgm3": "0.025"
	                            }
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},
	"Cadmium fume (as Cd)": {
		"name_add": "(Z37.5-1970)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
	                        "ceiling": {
	                            "values": {
	                                "mgm3": "0.3"
	                            }
	                        }
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Cadmium dust (as Cd)": {
		"name_add": "(Z37.5-1970)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
	                        "ceiling": {
	                            "values": {
	                                "mgm3": "0.6"
	                            }
	                        }
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Carbon disulfide": {
		"name_add": "(Z37.3-1968)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"max": {
								values: {
									ppm: 100
								},
								duration: '30 min'
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": "1"
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 12
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 30
	                            }
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Carbon tetrachloride": {
		"name_add": "(Z37.17-1967)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"max": {
								values: {
									ppm: 200
								},
								duration: '5 min in any 3 hr'
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 2
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 10
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 200
	                            }
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Chromic acid and chromates": {
		"name_add": "(Z37-7-1971)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							"ceiling": {
								"values": {
									"mg10m3": 1
								}
							}
						}
					}
				}
			}
		},
		z2: true
	},
	"Ethylene dibromide": {
		"name_add": "(Z37.31-1970)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"max": {
								values: {
									ppm: 50
								},
								duration: '5 min'
							}
	                    }
	                }
	            }
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"ceiling": {
	                            "values": {
	                                "ppm": .13
	                            }
							},
	                    }
	                }
	            },
	            "notes": [linkify('See Section 5219')]
	        }
	    },
		"z2": true
	},
	"Ethylene dichloride": {
		"name_add": "(Z37.21-1969)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"max": {
								values: {
									ppm: 200
								},
								duration: "5 min in any 3 hours"
							}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 1
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 2
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 200
	                            }
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Fluoride as dust": {
		"name_add": "(Z37.28-1969)",
		name: "Fluoride as dust",
		"standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
								"values": {
									"mgm3": 2.5
								},
								"duration": 480
							}
	                    },
	            		"notes": []
	                }
	            },
	            "notes": []
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
								"values": {
									"mgm3": 2.5
								},
								"duration": 480
							}
	                    },
	            		"notes": []
	                }
	            },
	            "notes": []
	        },
	        "niosh_rel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
								"values": {
									"mgm3": 2.5
								},
								"duration": 600
							}
	                    },
	            		"notes": []
	                }
	            },
	            "notes": []
	        },
	    },
		"z2": true
	},
	"Hydrogen fluoride": {
		"name_add": "(Z37.28-1969)",
	    "standards": {
	        "cal_osha_pel": {
	            "forms": {
	                "as F": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 0.4
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 1
	                            },
	                            "duration": 15
							}
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Hydrogen sulfide": {
		"name_add": "(Z37.2-1966)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
	                    	max: {
	                    		values: {
	                    			ppm: 50
	                    		},
	                    		duration: '10 min once only if no other measurable exposure occurs.'
	                    	}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 10
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 15
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 50
	                            }
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	'Mercury (Z37.8-1971)': {
		name: 'Mercury (Z37.8-1971)',
		z2: true,
		standards: {
			osha_pel: {
				forms: {
					Default: {
						durations: {
							ceiling: {
								values: {
									mgm3: 0.1
								}
							}
						}
					}
				}
			},
			cal_osha_pel: {
				forms: {
					"Metallic and inorganic": {
						durations: {
							default: {
								values: {
									mgm3: 0.025
								},
								duration: 480
							}
						}
					}
				}
			},
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: 0.05
								},
								duration: 600
							}
						}
					}
				}
			},
		}
	},
	"Methyl chloride": {
		"name_add": "(Z37.18-1969)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
	                    	max: {
	                    		values: {
	                    			ppm: 300
	                    		},
	                    		duration: '5 min in any 3 hours'
	                    	}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 50
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 300
	                            }
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Methylene chloride": {
		"name_add": "(Z37.31-1970)",
		general_standard: [link_gs('1910.1052')],
	    "standards": {
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 25
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 125
	                            },
	                            "duration": 15
							},
	                    }
	                }
	            },
	            notes: [linkify("See Section 5202")]
	        }
	    },
		"z2": true
	},
	"Mercury (organo) alkyl compounds (as Hg)": {
		"name_add": "(Z37.30-1969)",
	    "standards": {
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "mgm3": 0.01
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "mgm3": 0.03
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "mgm3": 0.04
	                            }
							},
	                    }
	                }
	            }
	        }
	    },
		"z2": true
	},
	"Styrene": {
		"name_add": "(Z37.15-1969)",
	    "standards": {
	        "osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
	                    	max: {
	                    		values: {
	                    			ppm: 600
	                    		},
	                    		duration: '5 min in any 3 hours'
	                    	}
	                    }
	                }
	            },
	        },
	        "cal_osha_pel": {
	            "forms": {
	                "Default": {
	                    "durations": {
							"default": {
	                            "values": {
	                                "ppm": 50
	                            },
	                            "duration": 480
							},
							"stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
							},
							"ceiling": {
	                            "values": {
	                                "ppm": 500
	                            }
							},
	                    }
	                }
	            },
	        }
	    },
		"z2": true
	},
	"Tetrachloroethylene": {
		"name_add": "(Z37.31-1970)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							max: {
								values: {
									ppm: 300
								},
								duration: '5 min in any 3 hours'
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "ppm": 25
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "ppm": 300
	                            }
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},
	"Toluene": {
		"name_add": "(Z37.12-1967)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							max: {
								values: {
									ppm: 500
								},
								duration: '10 min'
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "ppm": 10
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "ppm": 150
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "ppm": 500
	                            }
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},
	"Trichloroethylene": {
		"name_add": "(Z37.19-1967)",
		"standards": {
			"osha_pel": {
				"forms": {
					"Default": {
						"durations": {
							max: {
								values: {
									ppm: 300
								},
								duration: '5 min in any 2 hours'
							}
						}
					}
				},
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "ppm": 25
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "ppm": 100
	                            },
	                            "duration": 15
	                        },
	                        "ceiling": {
	                            "values": {
	                                "ppm": 300
	                            }
	                        }
						}
					}
				},
			}
		},
		"z2": true
	},

	// NPG

	'Coal dust': {
		"standards": {
			"osha_pel": {
				"forms": {
					"respirable, < 5% SiO<SUB>2</SUB>": {
						durations: {
							"default": {
								"values": {
									"mgm3": 2.4
								},
								duration: 480
							}
						}
					},
					"respirable, > 5% SiO<SUB>2</SUB>": {
						durations: {
							"default": {
								values: {
									fractional: {
										top: "10 mg/m<SUP>3</SUP>",
										bottom: "%SiO<SUB>2</SUB> + 2"
									}
								},
								duration: 480
							}
						}
					}
				},
				notes: [linkify('See Appendix C (Mineral Dusts)')]
				
			},
			"msha_pel": {
				"forms": {
					"respirable coal mine dust with < 5% silica": {
						durations: {
							"default": {
								"values": {
									"mgm3": '2.0'
								},
								duration: 480
							}
						}
					},
					"coal dust with > 5% silica": {
						durations: {
							"default": {
								values: {
									fractional: {
										top: "10 mg/m<SUP>3</SUP>",
										bottom: "% respirable quartz + 2"
									},
								},
								duration: 480
							}
						}
					}
				},
				notes: [linkify("See Appendix G")]
			},
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: 1
								},
								notes: ["measured according to MSHA method (CPSU)"],
								duration: 600
							},
							default2: {
								values: {
									mgm3: 0.9
								},
								notes: ["measured according to ISO/CEN/ACGIH criteria"],
								duration: 600
							}
						}
					}
				},
				notes: [linkify("See Appendix C (Coal Dust and Coal Mine Dust)")]
			}
		}
	},

	'Ethylene oxide': {
		standards: {
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									ppm: '< 0.1',
									mgm3: '0.18',
								},
								duration: 600
							},
							ceiling: {
								values: {
									ppm: 5,
									mgm3: 9,
								},
								duration: 10
							}
						}
					}
				},
				carcinogens: 1,
				notes: [linkify('See Appendix A')]
			},
			osha_pel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									ppm: 1
								},
								duration: 480
							},
							excursion: {
								values: {
									ppm: 5
								},
								duration: 15
							}
						}
					}
				},
				notes: [linkify('[1910.1047]')]
			},
			"cal_osha_pel": {
				"forms": {
					"Default": {
						"durations": {
	                        "default": {
	                            "values": {
	                                "ppm": 1
	                            },
	                            "duration": 480
	                        },
	                        "stel": {
	                            "values": {
	                                "ppm": 5
	                            },
	                            "duration": 15
	                        }
						}
					}
				},
				notes: [linkify('See Section 5220')]
			}
		}
	},

	'Lead': {
		standards: {
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: 0.05
								},
								duration: 600
							}
						}
					}
				},
			}
		}
	},

	'Chromium (VI) compounds': {
		standards: {
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: 0.05
								},
								duration: 600
							}
						}
					}
				},
				notes: [linkify('See Appendix A'), linkify('See Appendix C')]
			},
			cal_osha_pel: {
				forms: {
					Default: {
						durations: {
							ceiling: {
								values: {
									mgm3: 0.1
								}
							}
						}
					},
					"Cr": {
						durations: {
							default: {
								values: {
									mgm3: 0.005
								},
								duration: 480
							}
						}
					}
				},
				notes: ['See Sections <a href="https://www.dir.ca.gov/title8/1532_2.html">1532.2</a>, <a href="https://www.dir.ca.gov/title8/5206.html">5206</a>, and <a href="https://www.dir.ca.gov/title8/8359.html">8359</a>']
			}
		}
	},

	'Silica, amorphous': {
		standards: {
			osha_pel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mppcf: 20,
									fractional: {
										top: '80 mg/m<SUP>3</SUP>',
										bottom: '%SiO<SUB>2</SUB>'
									}
								},
								duration: 480
							}
						}
					}
				},
			}
		}
	},

	'Cotton dust (raw)': {
		standards: {
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: '< 0.200',
								},
								duration: 600
							}
						}
					}
				},
			}
		}
	},

	'Cotton dust': {
		standards: {
			niosh_rel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: '< 0.200',
								}
							}
						}
					}
				},
			}
		}
	},

	'tert-Butyl chromate (as CrO<SUB>3</SUB>)': {
		standards: {
			niosh_rel: {
				forms: {
					'Cr(VI)': {
						durations: {
							default: {
								values: {
									mgcrvim3: 0.001,
								},
								duration: 600
							}
						}
					}
				},
			},
			osha_pel: {
				forms: {
					'CrO<SUB>3</SUB>': {
						durations: {
							default: {
								values: {
									mgcro3m3: 0.005,
								},
								duration: 480
							}
						}
					}
				},
			}
		}
	},

	'Chromyl chloride': {
		standards: {
			niosh_rel: {
				forms: {
					'Cr(VI)': {
						durations: {
							default: {
								values: {
									mgm3: 0.001,
								},
								duration: 600
							}
						}
					}
				},
				carcinogens: 1,
				notes: [linkify('See Appendix A'),  linkify('See Appendix C')]
			},
		}
	},

	'Iron oxide (as Fe)': {
		standards: {
			niosh_rel: {
				forms: {
					'Dust and fume': {
						durations: {
							default: {
								values: {
									mgm3: 5,
								},
								duration: 600
							}
						}
					}
				},
			},
			cal_osha_pel: {
				forms: {
					'Fume': {
						durations: {
							default: {
								values: {
									mgm3: 5,
								},
								duration: 480
							}
						}
					}
				},
			},
			osha_pel: {
				forms: {
					'Dust and fume': {
						durations: {
							default: {
								values: {
									mgm3: 10,
								},
								duration: 480
							}
						}
					},
					'Fume': {
						durations: {
							default: {
								values: {
									mgm3: 10,
								},
								duration: 480
							}
						}
					}
				},
			}
		}
	},

	'Titanium dioxide - Total dust': {
		standards: {
			niosh_rel: {
				forms: {
					'Fine': {
						durations: {
							default: {
								values: {
									mgm3: 2.4,
								},
								duration: 600
							}
						}
					},
					'Ultrafine': {
						durations: {
							default: {
								values: {
									mgm3: 0.3,
								},
								duration: 600
							}
						}
					}
				},
				carcinogen: 1,
				notes: ['(ultrafine particles)', linkify('See Appendix A'), linkify('See Appendix C')]
			},
			cal_osha_pel: {
				notes: [linkify('See PNOR')]
			},
			osha_pel: {
				forms: {
					'Default': {
						durations: {
							default: {
								values: {
									mgm3: 15,
								},
								duration: 480
							}
						}
					}
				},
			}
		}
	},

	'Vanadium dust (as V<sub>2</sub>O<sub>5</sub>)': {
		z1: true,
		standards: {
			niosh_rel: {
				forms: {
					'Default': {
						durations: {
							ceiling: {
								values: {
									mgvm3: 0.05
								},
								duration: 15
							}
						}
					}
				},
				notes: ['[*Note: The REL applies to all vanadium compounds except Vanadium metal and Vanadium carbide (see Ferrovanadium dust).]']
			},
			osha_pel: {
				forms: {
					'Respirable dust': {
						durations: {
							ceiling: {
								values: {
									mgv2o5m3: 0.5
								}
							}
						}
					}
				},
				notes: [linkify('See Appendix G')]
			},
			cal_osha_pel: {
				forms: {
					'Vanadium pentoxide': {
						durations: {
							default: {
								values: {
									mgm3: 0.05
								},
								duration: 480
							}
						}
					}
				}
			}
		}
	},

	'Vanadium fume (as V<sub>2</sub>O<sub>5</sub>)': {
		z1: true,
		standards: {
			niosh_rel: {
				forms: {
					'Default': {
						durations: {
							ceiling: {
								values: {
									mgvm3: 0.05
								},
								duration: 15
							}
						}
					}
				}
			},
			osha_pel: {
				forms: {
					'Default': {
						durations: {
							ceiling: {
								values: {
									mgv2o5m3: 0.1
								}
							}
						}
					}
				},
				notes: [linkify('See Appendix G')]
			},
			cal_osha_pel: {
				forms: {
					'Default': {
						durations: {
							default: {
								values: {
									mgm3: 0.05
								},
								duration: 480
							}
						}
					}
				}
			}
		}
	},

	'Tin': {
		z1: true,
		standards: {
			cal_osha_pel: {
				forms: {
					Default: {
						durations: {
							default: {
								values: {
									mgm3: 2
								},
								duration: 480
							}
						},
						notes: ['also tin oxide; except SnH<sub>4</sub>']
					}
				}
			}
		}
	},

	'Nitroglycerine': {
		z1: true,
		standards: {
			cal_osha_pel: {
				forms: {
					'mixture of nitroglycerine and ethylene glycol dinitrate': {
						durations: {
							default: {
								values: {
									ppm: 0.05
								},
								duration: 480
							}
						}
					},
					'Default': {
						durations: {
							stel: {
								values: {
									mgm3: 0.1
								},
								duration: 15
							}
						}
					}
				}
			}
		}
	},

	'Carbon black': {
		z1: true,
		standards: {
			niosh_rel: {
				forms: {
					'Default': {
						durations: {
							default: {
								values: {
									mgm3: 3.5
								},
								duration: 600
							}
						}
					},
					'In presence of polycyclic aromatic hydrocarbons (PAHs)': {
						durations: {
							default: {
								values: {
									pahsm3: 0.1
								},
								duration: 600
							}
						},
						carcinogens: 1
					}
				},
				notes: [linkify('See Appendix A'), linkify('See Appendix C')]
			},
			osha_pel: {
				forms: {
					'Default': {
						durations: {
							default: {
								values: {
									mgm3: 3.5
								},
								duration: 480
							}
						}
					}
				},
				notes: [linkify('See Appendix G')]
			},
			cal_osha_pel: {
				forms: {
					'Default': {
						durations: {
							default: {
								values: {
									mgm3: 3.5
								},
								duration: 480
							}
						}
					}
				}
			}
		}
	},

	'Nickel metal and other compounds (as Ni)': {
		standards: {
			cal_osha_pel: {
				forms: {
					'metal': {
						durations: {
							default: {
								values: {
									mgm3: 0.5
								},
								duration: 480
							}
						}
					},
					'insoluble': {
						durations: {
							default: {
								values: {
									mgm3: 0.1
								},
								duration: 480
							}
						}
					}
				}
			}
		}
	}
}

let z3 = [
	'Silica, crystalline (as respirable dust)',
	'Silica, amorphous', 
	'Mica (containing less than 1% quartz)', 
	'Soapstone (containing less than 1% quartz)', 
	'Talc (containing no asbestos and less than 1% quartz)',
	'Talc (containing asbestos and less than 1% crystalline silica)',
	'Tremolite, asbestiform',
	'Asbestos',
	'Portland cement',
	'Graphite (natural)',
	'Coal dust',
	'Inert or Nuisance Dust'
]

// console.log(chemicals)
for(let name in manual) {

	if(chemicals[name]) {
		chemicals[name].merge(manual[name], true)
		if(manual[name].name_add) {
			chemicals[name].name += ' ' + manual[name].name_add
		}
	} else {
		newChemical(manual[name])
		if(manual[name].name_add) {
			chemicals[name].name += ' ' + manual[name].name_add
		}
	}
}

for(let name of z3) {
	if(chemicals[name]) {
		chemicals[name].z3 = true
	} else {
		newChemical({ name, z3: true })
	}
}
