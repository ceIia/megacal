import { faker } from "@faker-js/faker";
import moment from "moment";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { effect, signal, useSignal } from "@preact/signals-react";
import clsx from "clsx";
import { FpsView } from "react-fps";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

type Campaign = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
  onClick?: (id: string) => void;
};

// build a list of 50 campaigns (start date (before 1 feb 2023), end date (after 1 march 2023), name)
const fetchCampaigns = (
  count: number,
  from: Date,
  to: Date
): Promise<Campaign[]> => {
  const campaigns = [...Array(count).keys()].map((i) => {
    const startDate = faker.date.between(from, to);

    return {
      id: faker.datatype.uuid(),
      name: faker.company.catchPhrase(),
      startDate: startDate,
      endDate: faker.date.between(startDate, to),
      color: faker.internet.color(),
    };
  });

  return new Promise((resolve) => {
    setTimeout(() => resolve(campaigns), 1500);
  });
};

const today = moment();
const sixMonthsBefore = [...Array(6).keys()]
  .map((i) => today.clone().subtract(i + 1, "month"))
  .reverse();
const twelveMonthsAfter = [...Array(12).keys()].map((i) =>
  today.clone().add(i + 1, "month")
);

const initialHorizontalOffset = 150;
const daySize = (384 * 12) / 365;

const horizontalOffset = signal(initialHorizontalOffset);
const verticalOffset = signal(0);
const offsetCheckpoint = signal({ x: initialHorizontalOffset, y: 0 });
const months = signal([...sixMonthsBefore, today, ...twelveMonthsAfter]);
const campaigns = signal<Campaign[]>([]);

const addMonths = (count: number, direction: "before" | "after") => {
  const newMonths = [...months.value]; // get current value of months array

  // Add the specified number of months to the front or back of the array
  for (let i = 1; i <= count; i++) {
    if (direction === "before") {
      newMonths.unshift(moment(newMonths[0]).subtract(1, "month"));
    } else {
      newMonths.push(moment(newMonths[newMonths.length - 1]).add(1, "month"));
    }
  }

  // Update signals with new state
  months.value = newMonths;

  // fetch new campaigns
  fetchCampaigns(
    10,
    direction === "before"
      ? newMonths[0].toDate()
      : newMonths[newMonths.length - 1 - count].toDate(),
    direction === "before"
      ? newMonths[count].toDate()
      : newMonths[newMonths.length - 1].toDate()
  ).then((fetchedCampaigns) => {
    campaigns.value = [...campaigns.value, ...fetchedCampaigns];
  });
};

const fixOverflowScroll = () => {
  setTimeout(() => {
    horizontalOffset.value += 1;
    horizontalOffset.value -= 1;
  }, 100);
};

function App({ loading = true }) {
  const timelineContainer = useRef<HTMLDivElement>(null);
  const dragListener = useRef<HTMLDivElement>(null);
  const campaignsList = useRef<List>(null);
  const containerHeight = () => timelineContainer.current?.offsetHeight || 0;

  const updateHorizontalOffset = (offset: number) => {
    const firstMonthOffset = months.value[0].diff(today, "months") * 384;
    const lastMonthOffset =
      months.value[months.value.length - 1].diff(today, "months") * 384;

    const newOffset = offset + offsetCheckpoint.value.x;
    if (newOffset > -firstMonthOffset) {
      // prevent scrolling before the first month

      horizontalOffset.value = -firstMonthOffset;
    } else if (
      newOffset <
      -(lastMonthOffset - timelineContainer.current!.offsetWidth + 384)
    ) {
      // prevent scrolling after the last month

      horizontalOffset.value = -(
        (
          lastMonthOffset - // last month offset
          timelineContainer.current!.offsetWidth + // container width
          384
        ) // month width
      );
    } else {
      horizontalOffset.value = newOffset;
    }
  };

  const updateVerticalOffset = (offset: number, viewportHeight: number) => {
    // new offset is the current offset + the offset passed in
    // it should be clamped between 0 and the height of the container
    // calculated with the number of campaigns * 48px

    verticalOffset.value = Math.max(
      0,
      Math.min(
        (campaigns.value.length - 1) * 48 - viewportHeight + 8,
        verticalOffset.value + offset * -1
      )
    );
  };

  effect(() => {
    campaignsList.current?.scrollTo(verticalOffset.value);
  });

  useEffect(() => {
    fetchCampaigns(8, new Date(2023, 0, 1), new Date(2023, 5, 1))
      .then((fetchedCampaigns) => {
        campaigns.value = fetchedCampaigns;
      })
      .then(() => fixOverflowScroll());

    function wheel(event: WheelEvent) {
      event.preventDefault();
      horizontalOffset.value += event.deltaX * -0.5;
      updateVerticalOffset(event.deltaY * -0.5, containerHeight());
    }

    // add event listeners
    window.addEventListener("wheel", wheel, { passive: false });

    return () => {
      // remove event listeners
      window.removeEventListener("wheel", wheel);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-900 p-4 select-none">
      {process.env.NODE_ENV === "development" && (
        <FpsView height={50} width={300} top={containerHeight() - 50} />
      )}
      <div className="w-full h-full border border-slate-700 bg-slate-800 rounded-xl overflow-hidden flex">
        <div className="w-full h-full overflow-hidden" ref={timelineContainer}>
          <div className="relative h-full">
            {loading && (
              <motion.div
                className="w-48 h-[2px] bg-gradient-to-r from-transparent to-slate-50/60 absolute top-0"
                // make it go from left to right and fade out + loop
                animate={{ right: 0, opacity: [0, 0.75, 0.25, 0.75, 0] }}
                exit={{ right: 0, opacity: 0 }}
                transition={{
                  duration: 3,
                  ease: "easeOut",
                  repeat: Infinity,
                }}
              />
            )}

            <motion.div
              ref={dragListener}
              id="dragListener"
              className="inset-0 h-full absolute z-30 border-b border-solid border-slate-700 overflow-auto"
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDrag={(_, { offset }) => {
                updateHorizontalOffset(offset.x);
                //updateVerticalOffset(offset.y, containerHeight());
              }}
              onDragStart={() => {
                offsetCheckpoint.value.x = horizontalOffset.value;
                offsetCheckpoint.value.y = verticalOffset.value;
              }}
              onDragEnd={() => {
                offsetCheckpoint.value.x = horizontalOffset.value;
                offsetCheckpoint.value.y = verticalOffset.value;
              }}
            />

            <div className="flex relative overflow-hidden h-full w-full">
              {months.value.map((month, index) => (
                <div
                  key={month.toISOString()}
                  style={{
                    willChange: "transform",
                    transform: `translateX(${horizontalOffset.value}px)`,
                  }}
                >
                  <Month
                    month={month}
                    index={index}
                    containerHeight={containerHeight()}
                  />
                </div>
              ))}
            </div>

            <div
              className="w-full h-full absolute inset-0 top-14 z-40 [&>*]:pointer-events-none pointer-events-none"
              style={{
                height: containerHeight() - 56,
              }}
            >
              <List
                height={containerHeight() - 56}
                itemCount={campaigns.value.length}
                itemSize={48}
                width={timelineContainer.current?.offsetWidth || 0}
                ref={campaignsList}
                className="!overflow-x-hidden pb-4 "
                overscanCount={1}
              >
                {CampaignSpan}
              </List>
            </div>
            <AnimatePresence>
              {(horizontalOffset.value !== initialHorizontalOffset ||
                verticalOffset.value !== 0) && (
                <motion.div
                  className="absolute bottom-2 right-2 p-6 w-64 grid place-items-center bg-slate-900 drop-shadow-lg rounded-md z-50"
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 32 }}
                  transition={{ duration: 0.4, ease: "anticipate" }}
                >
                  <button
                    className="bg-slate-800 text-slate-100 p-2 rounded-md"
                    onClick={() => {
                      horizontalOffset.value = initialHorizontalOffset;
                      verticalOffset.value = 0;
                    }}
                  >
                    go back up
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

const shouldObserve = (index: number) => {
  return index === 5 || index === months.value.length - 6;
};

function Month({
  month,
  index,
  containerHeight,
}: {
  month: moment.Moment;
  index: number;
  containerHeight: number;
}) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const month = moment(
          (entry.target as HTMLElement).dataset.month, // have to cast to HTMLElement because the type is Element
          "MMMM YYYY"
        );

        if (month.isBefore(today, "month")) addMonths(6, "before");
        else addMonths(6, "after");
      });
    },
    { threshold: 0.5 }
  );

  useEffect(() => {
    if (monthRef.current && shouldObserve(index)) {
      observer.observe(monthRef.current);
    } else if (monthRef.current) {
      observer.unobserve(monthRef.current);
    }

    return () => {
      if (monthRef.current) observer.unobserve(monthRef.current);
    };
  }, [index]);

  const monthRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="absolute w-96 flex-shrink-0 px-3.5 z-[5] h-14"
      style={{
        left: month.diff(today, "months") * 384,
      }}
      id="month"
      data-month={month.format("MMMM YYYY")}
      ref={monthRef}
    >
      <p className="text-slate-300 font-medium pt-1">
        {month.format("MMMM")}
        <span className="text-slate-600 ml-1">{month.format("YYYY")}</span>
      </p>
      <div className="flex justify-between relative">
        {
          // horizontal list of days in the month below the month name
          // if the day is today, add a class of "bg-slate-700"
          new Array(month.daysInMonth()).fill(null).map((_, i) => {
            const day = month.clone().date(i + 1);
            const isToday = day.isSame(today, "day");
            const className = isToday
              ? "bg-slate-700 text-white"
              : "text-slate-300";

            return (
              <div
                className={clsx(
                  "w-2 h-2 pt-3 flex items-center justify-center text-sm flex-col relative z-40",
                  className,
                  i % 5 === 0 || isToday ? "opacity-100" : "opacity-0"
                )}
                key={day.toISOString()}
              >
                <p
                  className={clsx(
                    "px-3 py-0.5 w-7 text-sm flex items-center justify-center",
                    isToday && "bg-rose-900 rounded"
                  )}
                >
                  {day.format("D")}
                </p>
              </div>
            );
          })
        }

        {today.isSame(month, "month") && (
          <div
            // bar for today
            className="absolute"
            style={{
              left: today.date() * ((384 - 14 * 2) / month.daysInMonth()) - 1,
              height: containerHeight,
            }}
          >
            <div className="w-0 border-r-2 border-dashed border-slate-600 bg-slate-700 h-full" />
          </div>
        )}
      </div>

      <div
        className="flex absolute left-0 justify-between top-full"
        style={{
          width: monthRef.current?.clientWidth || 0,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          return (
            <div
              className={clsx(
                "w-px bg-slate-700 opacity-30",
                i === 0 && "-ml-px",
                i === 4 && "-mr-px"
              )}
              style={{ height: containerHeight }}
            />
          );
        })}
      </div>
    </div>
  );
}

const CampaignSpan = memo(({ style, index }: ListChildComponentProps) => {
  const campaign = campaigns.value[index];
  const duration = moment(campaign.endDate).diff(campaign.startDate, "days");

  const spanReference = useRef<HTMLDivElement>(null);
  const containerReference = useRef<HTMLDivElement>(null);
  const span = spanReference.current?.getBoundingClientRect();
  const container = containerReference.current?.getBoundingClientRect();

  const textOffset = useSignal(0);

  useLayoutEffect(() => {
    if (spanReference.current && containerReference.current) {
      const offset = (span?.left ?? 0) - (container?.left ?? 0);

      textOffset.value = offset * -1;
    }
  }, [span, container, textOffset]);

  return (
    <div
      style={style}
      className="!pointer-events-none"
      ref={containerReference}
    >
      <div
        className="!pointer-events-none"
        style={{
          // transform x & y
          willChange: "transform",
          transform: `translateX(${horizontalOffset.value}px)`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -5 }}
          animate={{
            opacity: 1,
            x: 0,
            transition: {
              ease: "anticipate",
              duration: 0.4,
              delay: 0.05,
            },
          }}
          className="!pointer-events-none"
        >
          <button
            className="flex items-center justify-between px-2.5 w-full h-12 p-1.5 z-40 pointer-events-auto"
            key={campaign.name}
            style={{
              width: duration * daySize + 28,
              transform: `translateX(${
                moment(campaign.startDate).diff(
                  today.clone().startOf("month"),
                  "days"
                ) * daySize
              }px)`,
            }}
            onClick={() => campaign.onClick?.(campaign.id)}
            aria-label={campaign.name}
          >
            <motion.div
              className="rounded-lg border-2 border-solid h-full w-full flex items-center transition-colors duration-200 ease-in-out group cursor-pointer overflow-hidden"
              style={{
                borderColor: campaign.color,
                backgroundColor: `${campaign.color}30`,
              }}
              whileHover={{ backgroundColor: campaign.color }}
              ref={spanReference}
            >
              <motion.p
                className="text-slate-400 truncate -mt-px text-sm font-medium group-hover:text-white transition-colors duration-200 ease-in-out ml-2"
                animate={{
                  x: Math.max(0, textOffset.value),
                  transition: {
                    ease: "linear",
                    duration: 0.3,
                  },
                }}
              >
                {campaign.name}
                <span className="ml-2 font-normal text-slate-500 group-hover:text-slate-200 transition-colors duration-200 ease-in-out">
                  {moment(campaign.startDate).format("MMM D")} -{" "}
                  {moment(campaign.endDate).format("MMM D")}
                </span>
              </motion.p>
            </motion.div>
          </button>
        </motion.div>
      </div>
    </div>
  );
});

export default App;
